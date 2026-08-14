// ============================================================================
// worker.js — entrada do Cloudflare Workers
//
// Desde ago/2025 o Workers roda servidores HTTP do Node, então o app Express
// sobe sem reescrita: `httpServerHandler` faz a ponte. O que muda aqui é
// só a plumbing:
//
//   • o binding do D1 (env.DB) é entregue à camada de dados a cada invocação
//   • as variáveis do wrangler viram process.env (o código todo lê de lá)
//   • os 3 node-cron viram Cron Triggers (handler `scheduled`)
//
// wrangler.toml precisa de:
//   compatibility_date  = "2025-09-01" ou mais novo
//   compatibility_flags = ["nodejs_compat", "enable_nodejs_http_server_modules"]
// ============================================================================

import { createServer } from 'node:http'
import { httpServerHandler } from 'cloudflare:node'

import app from './server.js'
import { setDb } from './config/d1.js'
import { CRONS } from './jobs.js'

// A porta é só uma chave de roteamento interna — não abre porta de rede.
const PORTA = 8787
const servidor = createServer(app)
servidor.listen(PORTA)
const handler = httpServerHandler({ port: PORTA })

// O código do backend lê tudo de process.env. As variáveis do wrangler chegam
// em `env`, então copiamos uma vez por isolate.
let envAplicado = false
function prepararAmbiente (env) {
  if (!envAplicado) {
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === 'string' || typeof v === 'number') process.env[k] = String(v)
    }
    envAplicado = true
  }
  if (!env.DB) throw new Error('[worker] binding DB não configurado no wrangler.toml')
  setDb(env.DB)
}

export default {
  async fetch (request, env, ctx) {
    prepararAmbiente(env)
    return handler.fetch(request, env, ctx)
  },

  // Cron Triggers — o equivalente aos node-cron. Os horários ficam no
  // wrangler.toml; aqui só decidimos qual tarefa roda em qual.
  async scheduled (event, env, ctx) {
    prepararAmbiente(env)
    // A comparação é exata: chave do CRONS === expressão do wrangler.toml.
    // Quando não bate, imprime as duas listas — foi assim que apareceu que os
    // horários estavam em fuso diferente e dois crons nunca rodavam.
    const tarefa = CRONS[event.cron]
    if (!tarefa) {
      console.warn('[cron] sem tarefa para "' + event.cron + '". Conhecidas:', Object.keys(CRONS).join(' | '))
      return
    }
    ctx.waitUntil(
      tarefa().catch(e => console.error('[cron]', event.cron, e && e.message))
    )
  }
}
