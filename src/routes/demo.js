// ============================================================================
// routes/demo.js — as rotas da instância de demonstração.
//
// Só existem de verdade quando a instância É uma demonstração. Num cliente
// real elas respondem "não é demonstração" e não fazem nada — mesmo que
// alguém descubra as URLs.
// ============================================================================

const express = require('express')
const router = express.Router()
const demo = require('../demo')
const { autenticar, exigirPerfil } = require('../middleware/auth')

/**
 * GET /demo/estado — aberta de propósito.
 * O app do cliente e o painel usam isto para mostrar a tarja "demonstração" e
 * o login sugerido. Num cliente real devolve ligada:false e mais nada: nenhuma
 * credencial vaza de instância que não seja demonstração.
 */
router.get('/demo/estado', async (_req, res) => {
  try {
    const st = await demo.estado()
    if (!st.ligada) return res.json({ ligada: false })
    res.json({
      ligada: true,
      email: demo.EMAIL_DEMO,
      // a senha é pública POR DESIGN: é o convite que vai no WhatsApp
      senha: process.env.DEMO_SENHA || 'demo1234',
      aviso: 'Ambiente de demonstração — os dados são fictícios e ficam salvos até você reiniciar.'
    })
  } catch (e) {
    res.json({ ligada: false })
  }
})

/**
 * POST /demo/reiniciar — devolve a demonstração ao estado inicial.
 * Exige login de proprietário. O visitante entra como proprietário, então ele
 * também pode reiniciar — e tudo bem: é justamente o botão de "limpar a casa
 * antes da próxima visita".
 */
router.post('/demo/reiniciar', autenticar, exigirPerfil('proprietario'), async (req, res) => {
  try {
    // ?fase=limpar e depois ?fase=semear: duas requisições, para caber no
    // limite de consultas por invocação do D1 no plano grátis.
    const fase = req.query.fase || (req.body && req.body.fase)
    if (fase && !['limpar', 'semear', 'tudo'].includes(fase)) {
      return res.status(400).json({ ok: false, erro: 'fase deve ser limpar, semear ou tudo' })
    }
    const r = await demo.reiniciar({ fase })
    res.json(r)
  } catch (e) {
    if (e.recusado) return res.status(409).json({ ok: false, erro: e.message })
    console.error('[demo/reiniciar]', e && e.message)
    res.status(500).json({ ok: false, erro: 'Falha ao reiniciar a demonstração' })
  }
})

module.exports = router
