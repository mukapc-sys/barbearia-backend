// ============================================================================
// jobs.js — as tarefas agendadas, sem depender de quem as dispara.
// No Node quem chama é o node-cron (local.js); no Worker, os Cron Triggers.
// ============================================================================
const { supabaseAdmin } = require('./config/supabase')
const MARCA = require('./config/marca')
const { enviarPushParaCliente } = require('./routes/publico')

// cron original: '0 8 * * *'
async function lembretesDoDiaSeguinte () {
  try {
    console.log('[CRON] Processando lembretes do dia seguinte...')
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const ini = new Date(amanha.setHours(0,0,0,0)).toISOString()
    const fim = new Date(amanha.setHours(23,59,59,999)).toISOString()

    const { data: agendamentos } = await supabaseAdmin
      .from('vw_agenda_dia')
      .select('cliente_nome, cliente_whatsapp, colaborador_nome, servico_nome, data_hora_ini, unidade_nome')
      .gte('data_hora_ini', ini)
      .lte('data_hora_ini', fim)
      .in('status', ['agendado', 'confirmado'])

    for (const ag of (agendamentos || [])) {
      if (!ag.cliente_whatsapp) continue

      const hora  = new Date(ag.data_hora_ini).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const data  = new Date(ag.data_hora_ini).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
      const msg   = `Olá ${ag.cliente_nome}! 👋\n\nLembrete do seu agendamento *amanhã*:\n\n✂️ *${ag.servico_nome}*\n👤 ${ag.colaborador_nome}\n📍 ${ag.unidade_nome}\n🕐 ${hora} — ${data}\n\nTe esperamos! Caso precise remarcar, responda esta mensagem.`

      await supabaseAdmin.from('notificacoes_whatsapp').insert({
        destinatario: '55' + ag.cliente_whatsapp.replace(/\D/g, ''),
        mensagem:     msg,
        tipo:         'lembrete',
        status:       'pendente'
      })
    }
    console.log(`[CRON] ${(agendamentos || []).length} lembretes enfileirados`)
  } catch (err) {
    console.error('[CRON] Erro ao processar lembretes:', err)
  }
}

// cron original: '0 3 * * *'
async function expirarPontos () {
  try {
    const { data, error } = await supabaseAdmin.rpc('expirar_pontos_inativos')
    if (error) throw error
    console.log('[CRON] Expiração de pontos executada. Carteiras zeradas:', data)
  } catch (err) {
    console.error('[CRON] Erro ao expirar pontos:', err.message)
  }
}

// cron original: '*/5 * * * *'
async function lembretesPush () {
  try {
    const agora = new Date()
    const em30  = new Date(agora.getTime() + 30 * 60000)
    const em60  = new Date(agora.getTime() + 60 * 60000)

    const { data: ags } = await supabaseAdmin.from('agendamentos')
      .select('id, cliente_id, data_hora_ini, unidades(nome)')
      .gt('data_hora_ini', agora.toISOString())
      .lte('data_hora_ini', em60.toISOString())
      .in('status', ['agendado', 'confirmado'])
      .not('cliente_id', 'is', null)
    if (!ags || !ags.length) return

    const ids = ags.map(a => a.id)
    const { data: enviados } = await supabaseAdmin.from('push_lembretes')
      .select('agendamento_id, tipo').in('agendamento_id', ids)
    const jaEnviado = new Set((enviados || []).map(s => s.agendamento_id + '|' + s.tipo))

    for (const a of ags) {
      const dt = new Date(a.data_hora_ini)
      const tipo = dt > em30 ? '1h' : '30m'   // 30–60min antes → "1h"; ≤30min → "30m"
      if (jaEnviado.has(a.id + '|' + tipo)) continue

      // horário de Brasília (UTC-3, sem horário de verão no Brasil)
      const br = new Date(dt.getTime() - 3 * 3600000)
      const hora = String(br.getUTCHours()).padStart(2, '0') + ':' + String(br.getUTCMinutes()).padStart(2, '0')
      const uni = (a.unidades && a.unidades.nome) ? ' na ' + a.unidades.nome : ''
      const quando = tipo === '1h' ? 'daqui a 1 hora' : 'em 30 minutos'

      try {
        await enviarPushParaCliente(a.cliente_id, {
          titulo: 'Seu horário está chegando ✂️',
          corpo: `Seu atendimento é ${quando}, às ${hora}${uni}. Até já!`,
          url: MARCA.siteUrl || undefined
        })
        await supabaseAdmin.from('push_lembretes').insert({ agendamento_id: a.id, tipo })
      } catch (e) { /* falha pontual não derruba o loop */ }
    }
  } catch (err) {
    console.error('[CRON push] erro:', err.message)
  }
}

// A demonstração NÃO se zera sozinha — decisão do Samuel: o que o prospecto
// mexe fica salvo, e ver a movimentação de um prospecto no front do outro
// mostra que o app está vivo. O reinício continua existindo, mas só na mão:
// pelo botão em Configurações, pelo endpoint POST /demo/reiniciar, ou por SQL.
// Por isso reiniciarDemonstracao() NÃO está no mapa de crons abaixo.
async function reiniciarDemonstracao () {
  const demo = require('./demo')
  const st = await demo.estado()
  if (!st.ligada) return
  const r = await demo.reiniciar()
  console.log('[demo] reiniciada em', r.ms + 'ms', JSON.stringify(r.criado))
  return r
}

// ⚠️  As CHAVES têm de ser IGUAIS às expressões do wrangler.toml: o worker faz
//     CRONS[event.cron], comparação exata. Estavam nos horários locais antigos
//     do node-cron ('0 8', '0 3') enquanto o wrangler dispara em UTC ('0 11',
//     '0 6') — ou seja, dois dos três crons nunca achavam tarefa. Cron Triggers
//     são SEMPRE UTC; o horário de Brasília vai no comentário.
module.exports = { lembretesDoDiaSeguinte, expirarPontos, lembretesPush, reiniciarDemonstracao, CRONS: {
  '0 11 * * *': lembretesDoDiaSeguinte,   // 08:00 em Brasília
  '0 6 * * *': expirarPontos,             // 03:00 em Brasília
  '*/5 * * * *': lembretesPush
} }
