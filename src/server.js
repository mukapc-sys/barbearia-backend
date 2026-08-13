require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const MARCA = require('./config/marca')

const app = express()

// ============================================================
// Middlewares globais
// ============================================================
app.use(cors({
  origin: function(origin, callback) {
    // Permite qualquer origem (ou sem origem como Postman)
    callback(null, origin || '*')
  },
  credentials: true
}))

// ------------------------------------------------------------------
// Leitura do corpo da requisição — feita à mão, de propósito.
//
// O express.json() puxa body-parser → raw-body → iconv-lite, e o iconv-lite
// não carrega no runtime do Cloudflare Workers ("require_streams is not a
// function"). Como a API é JSON puro, um parser de 20 linhas resolve e
// elimina a dependência.
// ------------------------------------------------------------------
const LIMITE_CORPO = 15 * 1024 * 1024

app.use((req, res, next) => {
  const metodo = req.method
  if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'DELETE') { req.body = {}; return next() }

  let dados = ''
  let tamanho = 0
  req.setEncoding('utf8')
  req.on('data', pedaco => {
    tamanho += Buffer.byteLength(pedaco)
    if (tamanho > LIMITE_CORPO) {
      const e = new Error('corpo grande demais'); e.status = 413; e.type = 'entity.too.large'
      req.destroy()
      return next(e)
    }
    dados += pedaco
  })
  req.on('end', () => {
    if (!dados) { req.body = {}; return next() }
    const tipo = String(req.headers['content-type'] || '')
    try {
      if (tipo.includes('application/x-www-form-urlencoded')) {
        req.body = Object.fromEntries(new URLSearchParams(dados))
      } else {
        req.body = JSON.parse(dados)
      }
    } catch (e) {
      return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' })
    }
    next()
  })
  req.on('error', next)
})

// Log de requisições em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${req.method} ${req.path}`)
    next()
  })
}

// ============================================================
// Rotas
// ============================================================
app.use('/auth',         require('./routes/auth'))
app.use('/agendamentos', require('./routes/agendamentos'))
app.use('/comandas',     require('./routes/comandas'))
app.use('/caixa',        require('./routes/caixa'))
app.use('/financeiro',   require('./routes/financeiro'))
app.use('/relatorios',   require('./routes/financeiro'))
app.use('/assistente',   require('./routes/assistente'))
app.use('/appbarber',    require('./routes/appbarber'))
app.use('/appbarber-raw', require('./routes/appbarber-raw'))
app.use('/fechamento',   require('./routes/fechamento'))
app.use('/metas',        require('./routes/metas'))
app.use('/balanco',      require('./routes/balanco'))
app.use('/permissoes',   require('./routes/permissoes'))
app.use('/publico',      require('./routes/publico'))
app.use('/whatsapp',     require('./routes/whatsapp'))
app.use('/push',         require('./routes/push-pro'))   // push do PRO (barbeiro)

// ---- Configurações do sistema ----
// [SEGURANÇA] Antes estas duas rotas eram públicas: qualquer pessoa lia e
// SOBRESCREVIA qualquer configuração do sistema (inclusive as regras de
// comissão e prêmio). Agora leitura exige login e escrita exige proprietário.
const { autenticar, exigirPerfil } = require('./middleware/auth')
const REGRAS = require('./config/regras')

app.get('/config/:chave', autenticar, async (req, res) => {
  const sb = require('./config/supabase').supabaseAdmin
  const { data } = await sb.from('configuracoes').select('valor').eq('chave', req.params.chave).single()
  res.json({ chave: req.params.chave, valor: data?.valor ?? null })
})

app.put('/config/:chave', autenticar, exigirPerfil('proprietario'), async (req, res) => {
  const sb = require('./config/supabase').supabaseAdmin
  const { valor } = req.body || {}
  const { error } = await sb.from('configuracoes').upsert({
    chave: req.params.chave,
    valor: typeof valor === 'object' ? JSON.stringify(valor) : String(valor),
    atualizado_em: new Date().toISOString()
  }, { onConflict: 'chave' })
  if (error) return res.status(500).json({ ok: false, erro: error.message })
  REGRAS.invalidarCache()   // a próxima leitura já pega o valor novo
  res.json({ ok: true })
})

// Lista as regras de negócio em vigor (padrão + o que estiver no banco).
app.get('/config', autenticar, async (_req, res) => {
  res.json(await REGRAS.carregar())
})
app.use('/',             require('./routes/cadastros'))
app.use('/',             require('./routes/novos'))
app.use('/',             require('./routes/dashboard'))

// Rota de health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    sistema: process.env.APP_NOME || 'APP',
    versao: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// Handler de erros
app.use((err, _req, res, _next) => {
  console.error('Erro não tratado:', err)
  // corpo grande demais (payload) -> avisa de forma clara em vez de 500 genérico
  if (err && (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413)) {
    return res.status(413).json({ ok: false, motivo: 'PAYLOAD_GRANDE', erro: 'Os dados enviados são grandes demais. Tente um período/dia menor.', detalhe: err.message })
  }
  res.status(500).json({ ok: false, erro: 'Erro interno do servidor', detalhe: (err && err.message) || String(err) })
})

// 404
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' })
})

// ============================================================
// Este arquivo só MONTA o app. Quem sobe o servidor:
//   local.js   → Node/Railway (app.listen + node-cron)
//   worker.js  → Cloudflare Workers (httpServerHandler + Cron Triggers)
// ============================================================
module.exports = app
