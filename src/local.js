// ============================================================================
// local.js — sobe o backend em Node (desenvolvimento, ou Railway se preferir).
// Em Cloudflare Workers quem manda é o worker.js.
//
//   SQLITE_ARQUIVO=./dev.db node src/local.js
// ============================================================================
require('dotenv').config()
const cron = require('node-cron')
const app = require('./server')
const { setDb } = require('./config/d1')
const { CRONS } = require('./jobs')
const MARCA = require('./config/marca')

// Em Node não existe binding do D1: usa um SQLite em arquivo com a MESMA
// interface (.all/.run) que o Worker entrega.
const Database = require('better-sqlite3')
const arquivo = process.env.SQLITE_ARQUIVO || './dev.db'
const sqlite = new Database(arquivo)
sqlite.pragma('foreign_keys = ON')
setDb({
  async all (sql, args) { return { results: sqlite.prepare(sql).all(args || []) } },
  async run (sql, args) { return sqlite.prepare(sql).run(args || []) }
})

for (const expr of Object.keys(CRONS)) {
  cron.schedule(expr, () => CRONS[expr]().catch(e => console.error('[cron]', expr, e.message)), {
    timezone: process.env.TZ_APP || 'America/Sao_Paulo'
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n🪒  ${MARCA.nome} — backend em http://localhost:${PORT}`)
  console.log(`   banco: ${arquivo}`)
  console.log(`   health: http://localhost:${PORT}/health\n`)
})
