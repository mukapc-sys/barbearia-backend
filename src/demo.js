// ============================================================================
// demo.js — a instância de demonstração
//
// O prospecto entra com um login único, mexe em TUDO (agenda, comanda, caixa,
// cadastro) e no dia seguinte encontra o sistema arrumado de novo.
//
// ⚠️  ESTE ARQUIVO APAGA DADOS. E o mesmo repositório serve todas as barbearias.
//     Por isso o reinício exige DUAS travas independentes, cada uma num lugar
//     diferente, e as duas precisam ser ligadas de propósito:
//
//       1. a variável de ambiente  DEMO_MODE=1        (no Worker)
//       2. a linha  demo_instancia = '1'              (na tabela configuracoes)
//
//     Uma variável ligada por engano no cliente errado não basta para apagar
//     nada: sem a marca no banco daquele cliente, a função recusa.
// ============================================================================

const bcrypt = require('bcryptjs')
const { supabaseAdmin } = require('./config/supabase')
const { executarSql, paraLiteral } = require('./config/d1')

// Os ids são gerados AQUI, não pelo banco. Assim as comandas já nascem com o
// total certo e os itens já sabem a qual comanda pertencem — sem precisar ler
// de volta. Importa porque o D1 conta consultas por invocação (50 no plano
// grátis): a versão que atualizava o total depois somava ~500 consultas só
// nesse passo.
const novoId = () => (globalThis.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : require('crypto').randomUUID()

const EMAIL_DEMO = process.env.DEMO_EMAIL || 'demo@demonstracao.app'
const SENHA_DEMO = process.env.DEMO_SENHA || 'demo1234'

// ---------------------------------------------------------------- as travas
async function marcaNoBanco () {
  const { data } = await supabaseAdmin
    .from('configuracoes').select('valor').eq('chave', 'demo_instancia').maybeSingle()
  return !!(data && String(data.valor) === '1')
}

/**
 * @returns {Promise<{ligada:boolean, motivo:string}>}
 */
async function estado () {
  const env = process.env.DEMO_MODE === '1'
  const banco = env ? await marcaNoBanco() : false
  if (env && banco) return { ligada: true, motivo: 'as duas travas estão ligadas' }
  if (!env && !banco) return { ligada: false, motivo: 'faltam as duas travas: DEMO_MODE=1 e a linha demo_instancia no banco' }
  if (!env) return { ligada: false, motivo: 'falta DEMO_MODE=1 nas variáveis do Worker' }
  return { ligada: false, motivo: "falta a linha demo_instancia = '1' na tabela configuracoes deste banco" }
}

// ----------------------------------------------------------------- utilidades
// Determinístico de propósito: o mesmo dia gera sempre a mesma demonstração,
// então dá para conferir a tela sabendo o que tem de aparecer.
let _s = 20260813
const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff }
const escolher = a => a[Math.floor(rnd() * a.length)]
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1))

// O sistema é de barbearia brasileira: o dia útil é o de Brasília, não o UTC.
const FUSO = -3
function hojeBR () {
  const br = new Date(Date.now() + FUSO * 3600000)
  return { y: br.getUTCFullYear(), m: br.getUTCMonth(), d: br.getUTCDate() }
}
function quando (diasAFrente, hora, minuto) {
  const h = hojeBR()
  return new Date(Date.UTC(h.y, h.m, h.d + (diasAFrente || 0), (hora || 0) - FUSO, minuto || 0)).toISOString()
}
function dia (offset) {
  const h = hojeBR()
  return new Date(Date.UTC(h.y, h.m, h.d + (offset || 0))).toISOString().slice(0, 10)
}
const mesAtual = () => dia(0).slice(0, 7)

/**
 * Insere muitas linhas gastando POUCAS consultas.
 *
 * Duas coisas custam caro no D1 e se atropelam: ele conta consultas por
 * invocação E limita 100 parâmetros por consulta. Com `?`, 491 comandas viram
 * dezenas de consultas. Aqui os valores vão escritos no SQL (escapados), então
 * o lote inteiro cabe em uma ou duas.
 *
 * E confere o resultado: a primeira versão devolvia "criei 491 comandas" com o
 * banco vazio, porque o erro voltava dentro de `{error}` e ninguém lia.
 */
async function inserir (tabela, linhas) {
  if (!linhas || !linhas.length) return 0
  const cols = Object.keys(linhas[0]).filter(k => linhas[0][k] !== undefined)
  const TETO = 60000                       // folga larga no tamanho do comando
  let escritas = 0
  let buffer = []
  let tamanho = 0
  const cabecalho = `INSERT INTO "${tabela}" (${cols.map(c => `"${c}"`).join(',')}) VALUES `

  const descarregar = async () => {
    if (!buffer.length) return
    await executarSql(cabecalho + buffer.join(','))
    escritas += buffer.length
    buffer = []
    tamanho = 0
  }
  for (const l of linhas) {
    const tupla = '(' + cols.map(c => paraLiteral(tabela, c, l[c])).join(',') + ')'
    if (tamanho + tupla.length > TETO) await descarregar()
    buffer.push(tupla)
    tamanho += tupla.length + 1
  }
  await descarregar()

  return escritas
}

/** Igual ao insert normal, mas explode se o banco recusar em vez de fingir. */
async function inserirConferido (tabela, linhas) {
  const { error } = await supabaseAdmin.from(tabela).insert(linhas)
  if (error) throw new Error(`falha ao inserir em ${tabela}: ${error.message}`)
  return linhas.length
}

// ------------------------------------------------------------------ catálogo
const BARBEIROS = ['Rafael Moura', 'Diego Santana', 'Lucas Ferreira', 'Bruno Camargo', 'Thiago Nunes', 'Vitor Almeida']
const CLIENTES = [
  'João Pedro Alves', 'Marcos Vinícius', 'Carlos Eduardo', 'Rodrigo Lima', 'Fernando Costa',
  'Gabriel Martins', 'Leonardo Dias', 'Paulo Henrique', 'Ricardo Oliveira', 'Matheus Souza',
  'Guilherme Prado', 'Daniel Ribeiro', 'Eduardo Farias', 'Alexandre Pinto', 'Renato Azevedo',
  'Márcio Teixeira', 'Vinícius Barbosa', 'Otávio Mendes', 'Caio Fernandes', 'Sérgio Antunes',
  'Henrique Vasques', 'Igor Machado', 'Juliano Peres', 'Kevin Andrade', 'Nelson Braga',
  'Osvaldo Lemos', 'Patrick Vieira', 'Rubens Cardoso'
]
const SERVICOS = [
  { nome: 'Corte Masculino', valor: 60, duracao_min: 30 },
  { nome: 'Corte + Barba', valor: 95, duracao_min: 60 },
  { nome: 'Barba Terapêutica', valor: 45, duracao_min: 30 },
  { nome: 'Corte Infantil', valor: 50, duracao_min: 30 },
  { nome: 'Pezinho', valor: 25, duracao_min: 15 },
  { nome: 'Platinado', valor: 180, duracao_min: 120 }
]
const PRODUTOS = [
  { nome: 'Pomada Modeladora', valor_venda: 45, categoria: 'Barbearia' },
  { nome: 'Shampoo Anticaspa', valor_venda: 38, categoria: 'Barbearia' },
  { nome: 'Óleo para Barba', valor_venda: 52, categoria: 'Barbearia' },
  { nome: 'Cerveja Long Neck', valor_venda: 12, categoria: 'Bar' },
  { nome: 'Refrigerante Lata', valor_venda: 8, categoria: 'Bar' },
  { nome: 'Água 500ml', valor_venda: 5, categoria: 'Bar' }
]
const PAGAMENTOS = ['dinheiro', 'credito', 'debito', 'pix']

// As tabelas que o prospecto pode sujar. A ordem respeita as chaves
// estrangeiras: filho antes de pai, senão o DELETE é recusado.
const A_LIMPAR = [
  'itens_comanda', 'comandas', 'agendamentos', 'lista_espera',
  'movimentacoes_estoque', 'estoque', 'uso_plano_mes', 'assinaturas',
  'historico_pontos', 'carteira_pontos', 'fichas', 'vales', 'vales_pix',
  'caixa_movimentos', 'caixa_sessoes', 'fechamentos', 'metas_colaborador',
  'metas_unidade', 'dre_lancamentos', 'notificacoes_whatsapp',
  'whatsapp_mensagens', 'whatsapp_conversas', 'push_lembretes',
  'clientes', 'produtos', 'categorias_produto', 'servicos', 'planos'
]

async function limpar () {
  const apagadas = []
  for (const t of A_LIMPAR) {
    try {
      // colaboradores e unidades NÃO entram: o login e a estrutura ficam
      await supabaseAdmin.from(t).delete().not('id', 'is', null)
      apagadas.push(t)
    } catch (e) { /* tabela que não existe nesta versão: segue */ }
  }
  // a equipe volta ao elenco padrão, menos o dono e o acesso de demonstração
  await supabaseAdmin.from('colaboradores').delete().not('perfil', 'in', '("proprietario")')
  return apagadas
}

// -------------------------------------------------------------------- semear
async function semear () {
  const sb = supabaseAdmin
  const criado = {}

  // ---- unidades: usa as que já existem; cria duas se o banco estiver vazio
  let { data: unidades } = await sb.from('unidades').select('id, nome').order('nome')
  if (!unidades || !unidades.length) {
    const r = await sb.from('unidades').insert([
      { nome: 'Centro', cidade: process.env.APP_CIDADE || 'Canoas', uf: process.env.APP_UF || 'RS' },
      { nome: 'Jardins', cidade: process.env.APP_CIDADE || 'Canoas', uf: process.env.APP_UF || 'RS' }
    ]).select()
    unidades = r.data || []
  }
  criado.unidades = unidades.length

  // ---- equipe
  const equipe = BARBEIROS.map((nome, i) => ({
    nome,
    email: nome.toLowerCase().split(' ')[0] + '@demonstracao.app',
    perfil: i === 1 ? 'gerente' : 'colaborador',
    unidade_id: unidades[i % unidades.length].id,
    comissao_pct: 40,
    ativo: 1
  }))
  equipe.push({
    nome: 'Recepção', email: 'recepcao@demonstracao.app', perfil: 'caixa',
    unidade_id: unidades[0].id, ativo: 1
  })
  equipe.forEach(c => { c.id = novoId(); c.user_id = c.id })
  await inserirConferido('colaboradores', equipe)
  const colaboradores = equipe
  const barbeiros = colaboradores.filter(c => c.perfil !== 'caixa')
  criado.colaboradores = colaboradores.length

  // ---- catálogo
  const servicos = SERVICOS.map(s => Object.assign({ id: novoId(), ativo: 1 }, s))
  await inserirConferido('servicos', servicos)
  const categorias = [
    { id: novoId(), nome: 'Barbearia', paga_comissao: 1 },
    { id: novoId(), nome: 'Bar', paga_comissao: 0 }
  ]
  await inserirConferido('categorias_produto', categorias)
  const catPorNome = {}
  categorias.forEach(c => { catPorNome[c.nome] = c.id })
  const produtos = PRODUTOS.map(p => ({
    id: novoId(), nome: p.nome, valor_venda: p.valor_venda, categoria_id: catPorNome[p.categoria], ativo: 1
  }))
  await inserirConferido('produtos', produtos)
  const planos = [
    { id: novoId(), nome: 'Plano Essencial', valor_mensal: 89.9, ativo: 1 },
    { id: novoId(), nome: 'Plano Premium', valor_mensal: 159.9, ativo: 1 }
  ]
  await inserirConferido('planos', planos)
  criado.servicos = (servicos || []).length
  criado.produtos = (produtos || []).length

  // ---- clientes
  const clientes = CLIENTES.map((nome, i) => ({
    id: novoId(),
    nome,
    whatsapp: '51' + (990000000 + i * 137).toString().slice(0, 9),
    unidade_pref: unidades[i % unidades.length].id,
    colaborador_pref: barbeiros[i % barbeiros.length].id,
    ativo: 1
  }))
  criado.clientes = await inserir('clientes', clientes)

  // ---- agenda: ONTEM, HOJE e AMANHÃ
  // Sem isso a demonstração abre numa agenda vazia — que é o oposto do que vende.
  const agendamentos = []
  const agora = new Date()
  const horaBR = new Date(agora.getTime() + FUSO * 3600000).getUTCHours()
  for (const [offset, quantos] of [[-1, 22], [0, 26], [1, 14]]) {
    for (let i = 0; i < quantos; i++) {
      const b = barbeiros[i % barbeiros.length]
      const s = escolher(servicos)
      const c = escolher(clientes)
      const hora = 9 + Math.floor(i / barbeiros.length) * 2 + (i % 2)
      if (hora > 20) continue
      const passou = offset < 0 || (offset === 0 && hora < horaBR)
      agendamentos.push({
        unidade_id: b.unidade_id,
        colaborador_id: b.id,
        cliente_id: c.id,
        cliente_nome: c.nome,
        servico_id: s.id,
        data_hora_ini: quando(offset, hora, (i % 2) * 30),
        data_hora_fim: quando(offset, hora, (i % 2) * 30 + s.duracao_min),
        status: passou ? 'concluido' : 'agendado',
        valor: s.valor,
        canal_origem: escolher(['app', 'balcao', 'whatsapp'])
      })
    }
  }
  criado.agendamentos = await inserir('agendamentos', agendamentos)

  // ---- comandas finalizadas do mês (é o que dá números ao financeiro)
  // Comanda e itens são montados juntos, em memória, para o total já sair certo
  // no INSERT — as telas mostram comanda.total, não a soma dos itens.
  const comandas = []
  const itens = []
  for (let d = 0; d >= -27; d--) {
    const quantas = entre(14, 22)
    for (let i = 0; i < quantas; i++) {
      const b = barbeiros[entre(0, barbeiros.length - 1)]
      const c = escolher(clientes)
      const id = novoId()
      const meus = []
      const sv = escolher(servicos)
      meus.push({ comanda_id: id, tipo: 'servico', servico_id: sv.id, descricao: sv.nome,
        quantidade: 1, valor_unit: sv.valor, colaborador_id: b.id })
      if (rnd() < 0.38) {
        const p = escolher(produtos)
        meus.push({ comanda_id: id, tipo: 'produto', produto_id: p.id, descricao: p.nome,
          quantidade: 1, valor_unit: p.valor_venda, colaborador_id: b.id })
      }
      const total = meus.reduce((s2, it) => s2 + it.valor_unit * it.quantidade, 0)
      comandas.push({
        id,
        unidade_id: b.unidade_id,
        colaborador_id: b.id,
        cliente_id: c.id,
        cliente_nome: c.nome,
        status: 'finalizada',
        forma_pgto: escolher(PAGAMENTOS),
        subtotal: total,
        total,
        aberta_em: quando(d, entre(9, 19), 0),
        finalizada_em: quando(d, entre(9, 20), 30)
      })
      itens.push(...meus)
    }
  }
  criado.comandas = await inserir('comandas', comandas)
  criado.itens = await inserir('itens_comanda', itens)

  // ---- estoque com saldo de verdade
  // Semeia o SALDO direto e registra a movimentação sem o gatilho: passar as 12
  // entradas pelo caminho normal custaria ~36 consultas só aqui, e o D1 conta
  // consulta por invocação.
  const movimentos = []
  const saldos = []
  for (const p of produtos) {
    for (const u of unidades) {
      const q = entre(12, 40)
      movimentos.push({ produto_id: p.id, unidade_id: u.id, tipo: 'entrada', quantidade: q })
      saldos.push({ produto_id: p.id, unidade_id: u.id, quantidade: q })
    }
  }
  await inserir('movimentacoes_estoque', movimentos)
  await inserir('estoque', saldos)

  // ---- assinaturas e pontos
  const assinantes = clientes.slice(0, 9)
  await inserir('assinaturas', assinantes.map((c, i) => ({
    cliente_id: c.id, plano_id: planos[i % planos.length].id, status: 'ativa',
    data_inicio: dia(-entre(20, 90)), data_renovacao: dia(entre(2, 25)),
    vendedor_id: barbeiros[i % barbeiros.length].id
  })))
  await inserir('carteira_pontos', clientes.slice(0, 18).map(c => ({
    cliente_id: c.id, saldo: entre(40, 620)
  })))
  criado.assinaturas = assinantes.length

  // ---- metas do mês
  await inserir('metas_unidade', unidades.map(u => ({
    unidade_id: u.id, mes: mesAtual(), faturamento: 42000, clientes: 520, produtos: 4200, planos: 12, bar: 1800
  })))
  await inserir('metas_colaborador', barbeiros.map(b => ({
    colaborador_id: b.id, unidade_id: b.unidade_id, mes: mesAtual(),
    faturamento: entre(7000, 12000), clientes: entre(90, 140), produtos: entre(400, 900), planos: entre(1, 4)
  })))

  return criado
}

// ------------------------------------------------------------- acesso do demo
/**
 * Recria o login que você manda ao prospecto. Roda a cada reinício, de propósito:
 * se alguém trocar a senha durante a visita, ela volta ao normal sozinha.
 */
async function garantirAcesso () {
  const { data: unidades } = await supabaseAdmin.from('unidades').select('id').order('nome').limit(1)
  const hash = bcrypt.hashSync(SENHA_DEMO, 10)
  const { data: existente } = await supabaseAdmin
    .from('colaboradores').select('id').eq('email', EMAIL_DEMO).maybeSingle()

  if (existente) {
    await supabaseAdmin.from('colaboradores')
      .update({ senha_hash: hash, ativo: 1, perfil: 'proprietario' }).eq('id', existente.id)
    return { email: EMAIL_DEMO, criado: false }
  }
  const { data } = await supabaseAdmin.from('colaboradores').insert({
    nome: 'Visitante (demonstração)',
    email: EMAIL_DEMO,
    perfil: 'proprietario',
    ativo: 1,
    senha_hash: hash,
    unidade_id: unidades && unidades[0] ? unidades[0].id : null
  }).select().single()
  if (data) await supabaseAdmin.from('colaboradores').update({ user_id: data.id }).eq('id', data.id)
  return { email: EMAIL_DEMO, criado: true }
}

// ------------------------------------------------------------------ reiniciar
/**
 * O D1 conta CONSULTAS POR INVOCAÇÃO — 1.000 no plano pago, bem menos no
 * grátis. Um reinício inteiro fica em ~75 consultas: passa folgado no pago e
 * estoura no grátis. Por isso ele também roda em duas partes, uma requisição
 * cada, e aí cabe nos dois planos:
 *
 *   reiniciar()                 tudo de uma vez  (~75 consultas)
 *   reiniciar({ fase: 'limpar' })  só apaga      (~28)
 *   reiniciar({ fase: 'semear' })  só repovoa    (~47)
 */
async function reiniciar (opcoes) {
  const fase = (opcoes && opcoes.fase) || 'tudo'
  const st = await estado()
  if (!st.ligada) {
    const e = new Error('reinício recusado: ' + st.motivo)
    e.recusado = true
    throw e
  }
  const t0 = Date.now()
  _s = 20260813                      // volta a semente: mesma demonstração sempre

  if (fase === 'limpar') {
    const apagadas = await limpar()
    return { ok: true, fase, ms: Date.now() - t0, tabelasLimpas: apagadas.length }
  }
  if (fase === 'semear') {
    const criado = await semear()
    const acesso = await garantirAcesso()
    return { ok: true, fase, ms: Date.now() - t0, criado, acesso }
  }
  await limpar()
  const criado = await semear()
  const acesso = await garantirAcesso()
  return { ok: true, fase: 'tudo', ms: Date.now() - t0, criado, acesso }
}

module.exports = { estado, reiniciar, semear, limpar, garantirAcesso, EMAIL_DEMO }
