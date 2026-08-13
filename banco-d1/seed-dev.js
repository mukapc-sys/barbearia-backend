#!/usr/bin/env node
// ============================================================================
// seed-dev.js — banco local para desenvolvimento e teste
//
//   node banco-d1/seed-dev.js [caminho-do-arquivo.db]
//
// Cria o schema e o mínimo para operar: 1 unidade, proprietário e barbeiro
// (senha "senha123"), 1 serviço, 1 produto com estoque, 1 cliente, caixa
// aberto e dois horários na agenda de hoje.
//
// NÃO use em produção — em produção o banco nasce vazio (06-primeiro-acesso).
// ============================================================================

const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const AQUI = __dirname
const ARQUIVO = process.argv[2] || path.join(AQUI, '..', 'backend', 'dev.db')

async function main () {
  if (fs.existsSync(ARQUIVO)) fs.unlinkSync(ARQUIVO)
  const sqlite = new Database(ARQUIVO)
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(fs.readFileSync(path.join(AQUI, '01-schema.sql'), 'utf8'))

  const d1 = require(path.join(AQUI, '..', 'backend', 'src', 'config', 'd1.js'))
  d1.setDb({
    async all (sql, args) { return { results: sqlite.prepare(sql).all(args || []) } },
    async run (sql, args) { return sqlite.prepare(sql).run(args || []) }
  })
  const sb = d1.supabaseAdmin
  const auth = require(path.join(AQUI, '..', 'backend', 'src', 'config', 'auth-local.js'))
  const senha = await auth.gerarHash('senha123')

  const uni = (await sb.from('unidades').insert({ nome: 'Centro', cidade: 'Canoas', uf: 'RS' }).select().single()).data
  await sb.from('horarios_unidade').insert([0, 1, 2, 3, 4, 5, 6].map(d => ({
    unidade_id: uni.id, dia_semana: d,
    hora_inicio: d === 0 ? null : (d === 6 ? '09:00:00' : '10:00:00'),
    hora_fim: d === 0 ? null : (d === 6 ? '18:00:00' : '20:00:00'),
    aberto: d !== 0
  })))

  const dono = (await sb.from('colaboradores').insert({
    nome: 'Samuel Costa', email: 'dono@vertice.com', perfil: 'proprietario',
    unidade_id: uni.id, senha_hash: senha
  }).select().single()).data
  const barbeiro = (await sb.from('colaboradores').insert({
    nome: 'Rafael Moura', email: 'rafael@vertice.com', perfil: 'colaborador',
    unidade_id: uni.id, comissao_pct: 40, senha_hash: senha
  }).select().single()).data

  const servico = (await sb.from('servicos').insert({ nome: 'Corte Masculino', valor: 60, duracao_min: 30 }).select().single()).data
  const cat = (await sb.from('categorias_produto').insert({ nome: 'Barbearia', paga_comissao: true }).select().single()).data
  const produto = (await sb.from('produtos').insert({ nome: 'Pomada', valor_venda: 45, categoria_id: cat.id }).select().single()).data
  await sb.from('estoque').insert({ produto_id: produto.id, unidade_id: uni.id, quantidade: 10 })
  const cliente = (await sb.from('clientes').insert({
    nome: 'João Pedro', whatsapp: '51999998888', unidade_pref: uni.id, colaborador_pref: barbeiro.id
  }).select().single()).data

  await sb.from('configuracoes').insert([
    { chave: 'pontos_dias_expirar', valor: '90' },
    { chave: 'comissao_faixas_servico', valor: JSON.stringify([{ ate: 8000, pct: 40 }, { ate: 11000, pct: 45 }, { ate: null, pct: 50 }]) },
    { chave: 'comissao_faixas_produto', valor: JSON.stringify([{ ate: 10, pct: 10 }, { ate: 20, pct: 20 }, { ate: null, pct: 30 }]) }
  ])

  // agenda de hoje, em horário de Brasília
  const hoje = new Date()
  const em = (h, m) => {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), h + 3, m || 0))
    return d.toISOString()
  }
  await sb.from('agendamentos').insert([
    { unidade_id: uni.id, colaborador_id: barbeiro.id, cliente_id: cliente.id, servico_id: servico.id, data_hora_ini: em(10), data_hora_fim: em(10, 30), status: 'concluido', valor: 60 },
    { unidade_id: uni.id, colaborador_id: barbeiro.id, cliente_id: cliente.id, servico_id: servico.id, data_hora_ini: em(14), data_hora_fim: em(14, 30), status: 'agendado', valor: 60 }
  ])
  await sb.from('caixa_sessoes').insert({
    unidade_id: uni.id, status: 'aberto', saldo_inicial: 200,
    aberto_por: dono.id, aberto_por_nome: dono.nome
  })

  const ids = { unidade: uni.id, dono: dono.id, barbeiro: barbeiro.id, cliente: cliente.id, servico: servico.id, produto: produto.id }
  fs.writeFileSync(path.join(path.dirname(ARQUIVO), 'dev-ids.json'), JSON.stringify(ids, null, 2))

  console.log(`banco: ${ARQUIVO}`)
  console.log('login: dono@vertice.com / senha123   (e rafael@vertice.com / senha123)')
  console.log('ids em dev-ids.json')
}

main().catch(e => { console.error(e); process.exit(1) })
