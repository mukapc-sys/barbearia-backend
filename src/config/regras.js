// ============================================================================
// regras.js — regras de negócio parametrizáveis por barbearia
//
// Tudo que muda de barbearia para barbearia (faixas de comissão, prêmio de
// gestão, pontos) sai do código e passa a viver na tabela `configuracoes`
// (chave/valor). Se a chave não existir no banco, vale o PADRÃO abaixo — ou
// seja: uma instalação nova funciona sem configurar nada.
//
// Para mudar uma regra: UPDATE em configuracoes (ou pela tela de Configurações).
// O cache expira em 60s, então a mudança pega sozinha.
// ============================================================================

const { supabaseAdmin } = require('./supabase')

// Faixas: `ate` é o limite SUPERIOR EXCLUSIVO. `ate: null` = daí para cima.
// A % vale para TUDO da faixa (não é marginal).
const PADRAO = {
  // serviço: faixa pelo VALOR faturado em serviço no mês
  comissao_faixas_servico: [
    { ate: 8000,  pct: 40 },
    { ate: 11000, pct: 45 },
    { ate: null,  pct: 50 }
  ],
  // produto: faixa pela QUANTIDADE de unidades vendidas no mês
  comissao_faixas_produto: [
    { ate: 10,   pct: 10 },
    { ate: 20,   pct: 20 },
    { ate: null, pct: 30 }
  ],
  premio_pct_com_meta: 5,        // % do faturamento da unidade se bateu a meta
  premio_pct_sem_meta: 3,        // % se não bateu
  premio_divisao_gerente: 75,    // % do prêmio para o(s) gerente(s)
  premio_divisao_subgerente: 25, // % para o(s) subgerente(s) — sem subgerente, gerente leva 100%
  pontos_reais_por_ponto: 1,     // R$ gastos em serviço por 1 ponto
  pontos_dias_expirar: 90,       // dias sem atendimento até zerar a carteira
  produtos_appbarber_desde: '2026-06-01' // data de corte da comissão de produto importado
}

const CHAVES = Object.keys(PADRAO)
const TTL_MS = 60 * 1000

let _cache = null
let _cacheEm = 0

function _parse (chave, bruto) {
  if (bruto === null || bruto === undefined || bruto === '') return PADRAO[chave]
  const padrao = PADRAO[chave]
  try {
    if (Array.isArray(padrao)) {
      const v = typeof bruto === 'string' ? JSON.parse(bruto) : bruto
      return Array.isArray(v) && v.length ? v : padrao
    }
    if (typeof padrao === 'number') {
      const n = Number(bruto)
      return Number.isFinite(n) ? n : padrao
    }
    return String(bruto)
  } catch (e) {
    console.warn(`[regras] valor inválido para "${chave}", usando o padrão:`, bruto)
    return padrao
  }
}

/** Carrega as regras (com cache de 60s). Nunca lança: em erro, devolve os padrões. */
async function carregar () {
  const agora = Date.now()
  if (_cache && agora - _cacheEm < TTL_MS) return _cache
  const r = Object.assign({}, PADRAO)
  try {
    const { data } = await supabaseAdmin
      .from('configuracoes').select('chave, valor').in('chave', CHAVES)
    ;(data || []).forEach(row => { r[row.chave] = _parse(row.chave, row.valor) })
  } catch (e) {
    console.warn('[regras] não consegui ler configuracoes, usando padrões:', e.message)
  }
  _cache = r
  _cacheEm = agora
  return r
}

/** Força o recarregamento na próxima chamada (use ao salvar uma configuração). */
function invalidarCache () { _cache = null; _cacheEm = 0 }

/** % da faixa em que `valor` cai. `ate` é limite superior exclusivo. */
function pctPorFaixa (faixas, valor) {
  const v = Number(valor) || 0
  const lista = Array.isArray(faixas) && faixas.length ? faixas : []
  for (const f of lista) {
    if (f.ate === null || f.ate === undefined || v < Number(f.ate)) return Number(f.pct) || 0
  }
  const ultima = lista[lista.length - 1]
  return ultima ? Number(ultima.pct) || 0 : 0
}

async function pctServico (totalServico) {
  const r = await carregar()
  return pctPorFaixa(r.comissao_faixas_servico, totalServico)
}

async function pctProduto (unidadesVendidas) {
  const r = await carregar()
  return pctPorFaixa(r.comissao_faixas_produto, unidadesVendidas)
}

module.exports = { carregar, invalidarCache, pctPorFaixa, pctServico, pctProduto, PADRAO, CHAVES }
