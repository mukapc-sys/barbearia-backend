// ============================================================================
// d1.js — camada de compatibilidade Supabase → Cloudflare D1
//
// O backend tem 577 chamadas no estilo supabase-js:
//     supabaseAdmin.from('comandas').select('*, clientes(nome)').eq(...)
//
// Reescrever tudo à mão seria arriscado justamente onde não pode errar
// (comissão, fechamento). Em vez disso, este módulo IMITA a API do
// supabase-js e traduz para SQL do D1. As rotas não mudam.
//
// Cobre o que o backend realmente usa:
//   select/insert/update/upsert/delete · eq neq gt gte lt lte in is not
//   like ilike or · order limit range · single maybeSingle
//   count exact/head · joins embutidos (1-1 e 1-N, com !inner e alias) · rpc
//
// Conversões (o Postgres e o SQLite discordam):
//   boolean  ↔ 0/1        json ↔ TEXT        numeric ↔ REAL
//   datas guardadas em TEXT ISO-8601 UTC, comparáveis lexicograficamente
// ============================================================================

const MAPA = require('./schema-map.json')
const COLUNAS = MAPA.colunas
const FKS = MAPA.fks

// ---------------------------------------------------------------- conexão
// Em Worker: setDb(env.DB). Em teste/Node: setDb(adaptador better-sqlite3).
let _db = null

/**
 * Aceita as duas formas de banco:
 *   • binding real do D1 (env.DB) — API `prepare(sql).bind(...).all()`
 *   • adaptador simples usado em teste/Node — API `all(sql, args)`
 * Por dentro tudo vira a segunda forma.
 */
function setDb (db) {
  if (db && typeof db.prepare === 'function' && typeof db.all !== 'function') {
    _db = {
      async all (sql, args) {
        const args2 = (args || []).map(v => v === undefined ? null : v)
        const st = args2.length ? db.prepare(sql).bind(...args2) : db.prepare(sql)
        const r = await st.all()
        return { results: (r && r.results) || [] }
      },
      async run (sql, args) {
        const args2 = (args || []).map(v => v === undefined ? null : v)
        const st = args2.length ? db.prepare(sql).bind(...args2) : db.prepare(sql)
        return st.run()
      }
    }
    return
  }
  _db = db
}
function db () {
  if (!_db) throw new Error('[d1] banco não configurado — chame setDb(env.DB)')
  return _db
}

// ---------------------------------------------------------------- valores
function paraSql (tabela, coluna, v) {
  if (v === undefined) return null
  if (v === null) return null
  const t = (COLUNAS[tabela] || {})[coluna]
  if (t === 'boolean') return v === true || v === 1 || v === '1' ? 1 : 0
  if (t === 'json') return typeof v === 'string' ? v : JSON.stringify(v)
  if (t === 'timestamp') {
    if (v instanceof Date) return v.toISOString()
    const d = new Date(v)
    return isNaN(d.getTime()) ? String(v) : d.toISOString()
  }
  if (t === 'float' || t === 'int') {
    if (v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}

function doSql (tabela, coluna, v) {
  const t = (COLUNAS[tabela] || {})[coluna]
  if (v === null || v === undefined) return null
  if (t === 'boolean') return v === 1 || v === '1' || v === true
  if (t === 'json') {
    if (typeof v !== 'string') return v
    try { return JSON.parse(v) } catch (e) { return v }
  }
  return v
}

// ------------------------------------------------- o que era trigger no banco
// O schema do D1 não tem nenhum trigger de propósito: o corpo
// `BEGIN ...; ...; END;` tem ponto e vírgula dentro, e o Console do D1 quebra
// o texto colado em cima do ';' — o schema não subia. As duas regras que os
// triggers cuidavam moram aqui, onde ainda dá para testar em JS.

/** `atualizado_em = agora` em todo UPDATE/upsert, como o ON UPDATE do Postgres. */
function marcarAtualizado (tabela, patch) {
  if (!(COLUNAS[tabela] || {}).atualizado_em) return patch
  if (patch.atualizado_em !== undefined) return patch      // quem mandou explícito manda
  return Object.assign({}, patch, { atualizado_em: new Date().toISOString() })
}

const DELTA_ESTOQUE = { entrada: 1, ajuste: 1, saida: -1, saida_venda: -1 }

/**
 * Saldo de estoque a cada linha de `movimentacoes_estoque`.
 * O backend nunca escreve em `estoque` direto — só insere a movimentação e
 * espera o saldo se ajustar. `ajuste` manda o delta, não o total.
 */
async function aplicarMovimentacaoEstoque (d, mov) {
  const sinal = DELTA_ESTOQUE[mov.tipo]
  if (!sinal || !mov.produto_id || !mov.unidade_id) return
  const qtd = Number(mov.quantidade)
  if (!Number.isFinite(qtd)) return
  const agora = new Date().toISOString()
  // escrever sem RETURNING pede run(); adaptador que só tenha all() cai nele
  const escrever = (sql, args) => typeof d.run === 'function' ? d.run(sql, args) : d.all(sql, args)
  await escrever(
    'INSERT INTO estoque (produto_id, unidade_id, quantidade) SELECT ?,?,0 ' +
    'WHERE NOT EXISTS (SELECT 1 FROM estoque WHERE produto_id = ? AND unidade_id = ?)',
    [mov.produto_id, mov.unidade_id, mov.produto_id, mov.unidade_id]
  )
  await escrever(
    'UPDATE estoque SET quantidade = quantidade + ?, atualizado_em = ? ' +
    'WHERE produto_id = ? AND unidade_id = ?',
    [sinal * qtd, agora, mov.produto_id, mov.unidade_id]
  )
}

// ---------------------------------------------------------------- select
// "*, clientes(nome), colaboradores!vendedor_id(id,nome)" vira uma árvore
function parseSelect (texto) {
  const campos = []
  const relacoes = []
  let i = 0, buf = ''
  const empurra = (s) => {
    s = s.trim()
    if (!s) return
    const abre = s.indexOf('(')
    if (abre === -1) { campos.push(s); return }
    const cabeca = s.slice(0, abre)
    const miolo = s.slice(abre + 1, s.lastIndexOf(')'))
    let alias = null, alvo = cabeca, fk = null, inner = false
    const ap = cabeca.indexOf(':')
    if (ap !== -1) { alias = cabeca.slice(0, ap).trim(); alvo = cabeca.slice(ap + 1).trim() }
    if (alvo.includes('!')) {
      const [a, b] = alvo.split('!')
      alvo = a.trim()
      if (b.trim() === 'inner') inner = true
      else fk = b.trim()
    }
    relacoes.push({ alias: alias || alvo, tabela: alvo, fk, inner, sub: parseSelect(miolo) })
  }
  while (i < texto.length) {
    const c = texto[i]
    if (c === '(') {
      let n = 1; buf += c; i++
      while (i < texto.length && n > 0) { if (texto[i] === '(') n++; if (texto[i] === ')') n--; buf += texto[i]; i++ }
      continue
    }
    if (c === ',') { empurra(buf); buf = ''; i++; continue }
    buf += c; i++
  }
  empurra(buf)
  return { campos, relacoes }
}

// Como a relação se liga: 1-1 (a tabela atual tem a FK) ou 1-N (a outra tem)
function resolverRelacao (tabela, rel) {
  if (rel.fk) return { tipo: 'um', fk: rel.fk, alvo: rel.tabela }
  const meus = FKS[tabela] || {}
  // 1) a coluna se chama como a relação? (ex.: criador:criado_por(nome))
  if (meus[rel.tabela]) return { tipo: 'um', fk: rel.tabela, alvo: meus[rel.tabela] }
  // 2) alguma FK minha aponta para essa tabela
  const candidatas = Object.keys(meus).filter(c => meus[c] === rel.tabela)
  if (candidatas.length) return { tipo: 'um', fk: candidatas[0], alvo: rel.tabela }
  // 3) a outra tabela aponta para mim → lista
  const dela = FKS[rel.tabela] || {}
  const volta = Object.keys(dela).filter(c => dela[c] === tabela)
  if (volta.length) return { tipo: 'muitos', fk: volta[0], alvo: rel.tabela }
  return null
}

// Dobra os acentos do português dentro do SQL: "João" e "JOAO" viram "joao".
// Feio, mas é determinístico e roda no D1 sem extensão nenhuma.
const ACENTOS = [
  ['á', 'a'], ['à', 'a'], ['ã', 'a'], ['â', 'a'], ['ä', 'a'],
  ['é', 'e'], ['ê', 'e'], ['è', 'e'],
  ['í', 'i'], ['ì', 'i'], ['î', 'i'],
  ['ó', 'o'], ['õ', 'o'], ['ô', 'o'], ['ò', 'o'], ['ö', 'o'],
  ['ú', 'u'], ['ù', 'u'], ['û', 'u'], ['ü', 'u'],
  ['ç', 'c'], ['ñ', 'n'],
  ['Á', 'a'], ['À', 'a'], ['Ã', 'a'], ['Â', 'a'], ['Ä', 'a'],
  ['É', 'e'], ['Ê', 'e'], ['È', 'e'],
  ['Í', 'i'], ['Ì', 'i'], ['Î', 'i'],
  ['Ó', 'o'], ['Õ', 'o'], ['Ô', 'o'], ['Ò', 'o'], ['Ö', 'o'],
  ['Ú', 'u'], ['Ù', 'u'], ['Û', 'u'], ['Ü', 'u'],
  ['Ç', 'c'], ['Ñ', 'n']
]
function semAcento (expr) {
  return ACENTOS.reduce((acc, [de, para]) => `replace(${acc},'${de}','${para}')`, expr)
}

// ---------------------------------------------------------------- consulta
class Consulta {
  constructor (tabela) {
    this.tabela = tabela
    this.acao = 'select'
    this.colunas = '*'
    this.arvore = null
    this.condicoes = []      // {sql, args}
    this.ordens = []
    this._limit = null
    this._offset = null
    this._single = false
    this._maybe = false
    this._count = null
    this._head = false
    this.linhas = null
    this.patch = null
    this.conflito = null
    this._retornar = false
  }

  // ---- filtros ----
  _campo (col) {
    if (!col.includes('.')) return `"${this.tabela}"."${col}"`
    const [rel, c] = col.split('.')
    return `"${rel}"."${c}"`
  }
  _tabelaDe (col) { return col.includes('.') ? col.split('.')[0] : this.tabela }
  _colDe (col) { return col.includes('.') ? col.split('.')[1] : col }
  _cmp (col, op, v) {
    const t = this._tabelaDe(col), c = this._colDe(col)
    this.condicoes.push({ sql: `${this._campo(col)} ${op} ?`, args: [paraSql(t, c, v)] })
    return this
  }
  eq (c, v) { return v === null ? this.is(c, null) : this._cmp(c, '=', v) }
  neq (c, v) { return this._cmp(c, '!=', v) }
  gt (c, v) { return this._cmp(c, '>', v) }
  gte (c, v) { return this._cmp(c, '>=', v) }
  lt (c, v) { return this._cmp(c, '<', v) }
  lte (c, v) { return this._cmp(c, '<=', v) }
  like (c, v) { return this._cmp(c, 'LIKE', v) }
  ilike (c, v) {
    // O ILIKE do Postgres ignora caixa E acento; o LIKE do SQLite só ignora
    // caixa em ASCII — "JOÃO" não casaria com "João". Dobramos os acentos nos
    // dois lados com replace() aninhado para o comportamento ficar igual.
    const t = this._tabelaDe(c), col = this._colDe(c)
    this.condicoes.push({
      sql: `${semAcento(this._campo(c))} LIKE ${semAcento('?')} COLLATE NOCASE`,
      args: [paraSql(t, col, v)]
    })
    return this
  }
  is (c, v) {
    if (v === null) { this.condicoes.push({ sql: `${this._campo(c)} IS NULL`, args: [] }); return this }
    return this._cmp(c, '=', v)
  }
  in (c, arr) {
    const lista = Array.isArray(arr) ? arr : []
    if (!lista.length) { this.condicoes.push({ sql: '1 = 0', args: [] }); return this }
    const t = this._tabelaDe(c), col = this._colDe(c)
    this.condicoes.push({
      sql: `${this._campo(c)} IN (${lista.map(() => '?').join(',')})`,
      args: lista.map(v => paraSql(t, col, v))
    })
    return this
  }
  not (c, op, v) {
    if (op === 'is' && v === null) { this.condicoes.push({ sql: `${this._campo(c)} IS NOT NULL`, args: [] }); return this }
    if (op === 'eq') { return this._cmp(c, '!=', v) }
    if (op === 'in') {
      const vals = String(v).replace(/^\(|\)$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      const t = this._tabelaDe(c), col = this._colDe(c)
      this.condicoes.push({
        sql: `(${this._campo(c)} IS NULL OR ${this._campo(c)} NOT IN (${vals.map(() => '?').join(',')}))`,
        args: vals.map(x => paraSql(t, col, x))
      })
      return this
    }
    throw new Error('[d1] not() com operador não suportado: ' + op)
  }
  // "nome.ilike.%x%,whatsapp.ilike.%x%"  ·  "finalizado.eq.true,editado_local.eq.true"
  or (expr) {
    const partes = String(expr).split(',').map(p => p.trim()).filter(Boolean)
    const sqls = [], args = []
    for (const p of partes) {
      const i1 = p.indexOf('.'), i2 = p.indexOf('.', i1 + 1)
      const col = p.slice(0, i1), op = p.slice(i1 + 1, i2)
      let val = p.slice(i2 + 1)
      const t = this._tabelaDe(col), c = this._colDe(col)
      if (op === 'ilike') { sqls.push(`${semAcento(this._campo(col))} LIKE ${semAcento('?')} COLLATE NOCASE`); args.push(val) }
      else if (op === 'eq') {
        const vv = val === 'true' ? true : val === 'false' ? false : val
        sqls.push(`${this._campo(col)} = ?`); args.push(paraSql(t, c, vv))
      } else if (op === 'cs') {           // contains, em coluna JSON
        sqls.push(`${this._campo(col)} LIKE ? COLLATE NOCASE`)
        args.push('%' + val.replace(/^\{|\}$/g, '') + '%')
      } else if (op === 'is') {
        sqls.push(val === 'null' ? `${this._campo(col)} IS NULL` : `${this._campo(col)} = ?`)
        if (val !== 'null') args.push(paraSql(t, c, val))
      } else throw new Error('[d1] or() com operador não suportado: ' + op)
    }
    this.condicoes.push({ sql: '(' + sqls.join(' OR ') + ')', args })
    return this
  }
  match (obj) { Object.keys(obj || {}).forEach(k => this.eq(k, obj[k])); return this }

  // ---- forma do resultado ----
  order (col, opts) {
    const asc = !opts || opts.ascending !== false
    const nulls = opts && opts.nullsFirst ? '' : ''
    this.ordens.push(`${this._campo(col)} ${asc ? 'ASC' : 'DESC'}${nulls}`)
    return this
  }
  limit (n) { this._limit = n; return this }
  range (de, ate) { this._offset = de; this._limit = (ate - de + 1); return this }
  single () { this._single = true; return this }
  maybeSingle () { this._single = true; this._maybe = true; return this }

  // ---- ações ----
  select (cols, opts) {
    if (this.acao === 'select') {
      this.colunas = cols || '*'
      this.arvore = parseSelect(this.colunas)
      if (opts && opts.count) this._count = opts.count
      if (opts && opts.head) this._head = true
    } else {
      this._retornar = true
      if (cols) { this.colunas = cols; this.arvore = parseSelect(cols) }
    }
    return this
  }
  insert (linhas) { this.acao = 'insert'; this.linhas = Array.isArray(linhas) ? linhas : [linhas]; return this }
  /**
   * Desliga as regras que a camada aplica por linha (hoje: o saldo de estoque).
   * Serve para SEMEAR um estado inicial — a demonstração escreve o saldo direto
   * em vez de simular centenas de movimentações, o que economiza consultas num
   * ambiente que as conta (D1). Não use em fluxo de venda.
   */
  semGatilho () { this._semGatilho = true; return this }
  update (patch) { this.acao = 'update'; this.patch = patch; return this }
  upsert (linhas, opts) {
    this.acao = 'upsert'
    this.linhas = Array.isArray(linhas) ? linhas : [linhas]
    this.conflito = (opts && opts.onConflict) ? String(opts.onConflict).split(',').map(s => s.trim()) : ['id']
    return this
  }
  delete () { this.acao = 'delete'; return this }

  _where () {
    if (!this.condicoes.length) return { sql: '', args: [] }
    return {
      sql: ' WHERE ' + this.condicoes.map(c => c.sql).join(' AND '),
      args: this.condicoes.flatMap(c => c.args)
    }
  }

  // ---- execução ----
  async _rodar () {
    const d = db()
    if (this.acao === 'select') return this._selecionar(d)

    if (this.acao === 'insert' || this.acao === 'upsert') {
      const saida = []

      // Lote: linhas com as MESMAS colunas cabem num INSERT só, com vários
      // VALUES. Importa porque o D1 conta consultas por invocação (50 no plano
      // grátis) — semear a demonstração linha a linha estourava o limite.
      // Fica de fora quem precisa de tratamento por linha: upsert e estoque.
      if (this.acao === 'insert' && this.linhas.length > 1 &&
          (this._semGatilho || this.tabela !== 'movimentacoes_estoque')) {
        const assinatura = l => Object.keys(l).filter(k => l[k] !== undefined).sort().join('')
        const grupos = new Map()
        for (const l of this.linhas) {
          const k = assinatura(l)
          if (!grupos.has(k)) grupos.set(k, [])
          grupos.get(k).push(l)
        }
        for (const linhas of grupos.values()) {
          const cols = Object.keys(linhas[0]).filter(k => linhas[0][k] !== undefined)
          const tupla = `(${cols.map(() => '?').join(',')})`
          // O D1 aceita no MÁXIMO 100 parâmetros por consulta. Um lote fixo de
          // 50 linhas estourava isso em qualquer tabela com mais de 2 colunas —
          // e o erro voltava dentro de `{error}`, que ninguém lia. Agora o
          // tamanho do lote sai da contagem de colunas.
          const LOTE = Math.max(1, Math.floor(100 / cols.length))
          for (let i = 0; i < linhas.length; i += LOTE) {
            const fatia = linhas.slice(i, i + LOTE)
            const args = fatia.flatMap(l => cols.map(c => paraSql(this.tabela, c, l[c])))
            const sql = `INSERT INTO "${this.tabela}" (${cols.map(c => `"${c}"`).join(',')}) ` +
              `VALUES ${fatia.map(() => tupla).join(',')} RETURNING *`
            const r = await d.all(sql, args)
            saida.push(...(r.results || []))
          }
        }
        return this._comRelacoes(saida.map(l => this._converterLinha(l)))
      }

      for (const bruta of this.linhas) {
        // no upsert o caminho "já existe" é um UPDATE: precisa carimbar a data
        const linha = this.acao === 'upsert' ? marcarAtualizado(this.tabela, bruta) : bruta
        const cols = Object.keys(linha).filter(k => linha[k] !== undefined)
        const args = cols.map(k => paraSql(this.tabela, k, linha[k]))
        let sql = `INSERT INTO "${this.tabela}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`
        if (this.acao === 'upsert') {
          const atualiza = cols.filter(c => !this.conflito.includes(c))
          sql += ` ON CONFLICT(${this.conflito.map(c => `"${c}"`).join(',')}) DO ` +
            (atualiza.length ? `UPDATE SET ${atualiza.map(c => `"${c}"=excluded."${c}"`).join(',')}` : 'NOTHING')
        }
        sql += ' RETURNING *'
        const r = await d.all(sql, args)
        saida.push(...(r.results || []))
        if (this.tabela === 'movimentacoes_estoque' && !this._semGatilho) {
          const gravada = (r.results && r.results[0]) || linha
          await aplicarMovimentacaoEstoque(d, gravada)
        }
      }
      return this._comRelacoes(saida.map(l => this._converterLinha(l)))
    }

    if (this.acao === 'update') {
      const patch = marcarAtualizado(this.tabela, this.patch)
      const cols = Object.keys(patch).filter(k => patch[k] !== undefined)
      const w = this._where()
      const sql = `UPDATE "${this.tabela}" SET ${cols.map(c => `"${c}"=?`).join(',')}${w.sql} RETURNING *`
      const args = cols.map(k => paraSql(this.tabela, k, patch[k])).concat(w.args)
      const r = await d.all(sql, args)
      return this._comRelacoes((r.results || []).map(l => this._converterLinha(l)))
    }

    if (this.acao === 'delete') {
      const w = this._where()
      const r = await d.all(`DELETE FROM "${this.tabela}"${w.sql} RETURNING *`, w.args)
      return this._formatar((r.results || []).map(l => this._converterLinha(l)))
    }
  }

  async _selecionar (d) {
    const arv = this.arvore || parseSelect(this.colunas)

    // contagem pura
    if (this._head || this._count) {
      const juncoes = this._juncoes(arv)
      const w = this._where()
      const r = await d.all(`SELECT COUNT(*) AS n FROM "${this.tabela}"${juncoes.sql}${w.sql}`, juncoes.args.concat(w.args))
      const n = (r.results && r.results[0] ? r.results[0].n : 0)
      if (this._head) return { data: null, count: n, error: null }
      this._countValor = n
    }

    const juncoes = this._juncoes(arv)
    const proj = this._projecao(arv)
    const w = this._where()
    let sql = `SELECT ${proj.sql} FROM "${this.tabela}"${juncoes.sql}${w.sql}`
    if (this.ordens.length) sql += ' ORDER BY ' + this.ordens.join(', ')
    if (this._limit !== null) sql += ` LIMIT ${Number(this._limit)}`
    if (this._offset !== null) sql += ` OFFSET ${Number(this._offset)}`

    const r = await d.all(sql, juncoes.args.concat(w.args))
    let linhas = (r.results || []).map(l => this._montar(l, arv))

    // relações 1-N: uma consulta a mais por relação, e costura em memória
    for (const rel of arv.relacoes) {
      const info = resolverRelacao(this.tabela, rel)
      if (!info || info.tipo !== 'muitos') continue
      const ids = [...new Set(linhas.map(l => l.id).filter(x => x !== null && x !== undefined))]
      let filhos = []
      if (ids.length) {
        const sub = new Consulta(info.alvo)
        sub.colunas = rel.sub.campos.concat(rel.sub.relacoes.map(x => x.tabela + '(' + x.sub.campos.join(',') + ')')).join(',')
        if (!sub.colunas) sub.colunas = '*'
        sub.arvore = parseSelect(sub.colunas + ',' + info.fk)
        sub.in(info.fk, ids)
        const res = await sub._rodar()
        filhos = res.data || []
      }
      linhas.forEach(l => { l[rel.alias] = filhos.filter(f => f[info.fk] === l.id) })
    }

    return this._formatar(linhas)
  }

  _juncoes (arv) {
    const sql = []
    const args = []
    for (const rel of arv.relacoes) {
      const info = resolverRelacao(this.tabela, rel)
      if (!info || info.tipo !== 'um') continue
      const tipo = rel.inner ? 'INNER' : 'LEFT'
      sql.push(` ${tipo} JOIN "${info.alvo}" AS "${rel.alias}" ON "${rel.alias}"."id" = "${this.tabela}"."${info.fk}"`)
      // relação aninhada (ex.: colaboradores(nome, unidades(nome)))
      for (const sub of rel.sub.relacoes) {
        const infoSub = resolverRelacao(info.alvo, sub)
        if (!infoSub || infoSub.tipo !== 'um') continue
        const apelido = rel.alias + '__' + sub.alias
        sql.push(` LEFT JOIN "${infoSub.alvo}" AS "${apelido}" ON "${apelido}"."id" = "${rel.alias}"."${infoSub.fk}"`)
      }
    }
    return { sql: sql.join(''), args }
  }

  _projecao (arv) {
    const partes = []
    const locais = arv.campos.length ? arv.campos : ['*']
    if (locais.includes('*')) partes.push(`"${this.tabela}".*`)
    locais.filter(c => c !== '*').forEach(c => partes.push(`"${this.tabela}"."${c}" AS "${c}"`))

    for (const rel of arv.relacoes) {
      const info = resolverRelacao(this.tabela, rel)
      if (!info || info.tipo !== 'um') continue
      const cols = rel.sub.campos.length ? rel.sub.campos : ['*']
      const reais = cols.includes('*') ? Object.keys(COLUNAS[info.alvo] || {}) : cols
      reais.forEach(c => partes.push(`"${rel.alias}"."${c}" AS "${rel.alias}__${c}"`))
      for (const sub of rel.sub.relacoes) {
        const infoSub = resolverRelacao(info.alvo, sub)
        if (!infoSub || infoSub.tipo !== 'um') continue
        const apelido = rel.alias + '__' + sub.alias
        const cs = sub.sub.campos.length ? sub.sub.campos : Object.keys(COLUNAS[infoSub.alvo] || {})
        cs.forEach(c => partes.push(`"${apelido}"."${c}" AS "${apelido}___${c}"`))
      }
    }
    return { sql: partes.join(', ') }
  }

  _converterLinha (linha) {
    const out = {}
    for (const k of Object.keys(linha)) out[k] = doSql(this.tabela, k, linha[k])
    return out
  }

  _montar (linha, arv) {
    const out = {}
    const aninhados = {}
    for (const k of Object.keys(linha)) {
      if (k.includes('___')) {
        const [pai, filho] = k.split('___')
        const [relPai, relFilho] = pai.split('__')
        aninhados[relPai] = aninhados[relPai] || {}
        aninhados[relPai][relFilho] = aninhados[relPai][relFilho] || {}
        aninhados[relPai][relFilho][filho] = linha[k]
      } else if (k.includes('__')) {
        const [rel, col] = k.split('__')
        aninhados[rel] = aninhados[rel] || {}
        aninhados[rel][col] = linha[k]
      } else {
        out[k] = doSql(this.tabela, k, linha[k])
      }
    }
    for (const rel of arv.relacoes) {
      const info = resolverRelacao(this.tabela, rel)
      if (!info || info.tipo !== 'um') continue
      const bruto = aninhados[rel.alias]
      if (!bruto) { out[rel.alias] = null; continue }
      const obj = {}
      let vazio = true
      for (const c of Object.keys(bruto)) {
        if (c === '__nested__') continue
        const v = bruto[c]
        if (typeof v === 'object' && v !== null) { obj[c] = v; continue }
        obj[c] = doSql(info.alvo, c, v)
        if (v !== null && v !== undefined) vazio = false
      }
      // relação aninhada já veio como objeto
      for (const sub of rel.sub.relacoes) {
        if (bruto[sub.alias] && typeof bruto[sub.alias] === 'object') {
          const infoSub = resolverRelacao(info.alvo, sub)
          const o2 = {}
          let vazio2 = true
          for (const c of Object.keys(bruto[sub.alias])) {
            o2[c] = infoSub ? doSql(infoSub.alvo, c, bruto[sub.alias][c]) : bruto[sub.alias][c]
            if (bruto[sub.alias][c] !== null) vazio2 = false
          }
          obj[sub.alias] = vazio2 ? null : o2
        }
      }
      out[rel.alias] = vazio ? null : obj
    }
    return out
  }

  // Depois de INSERT/UPDATE, se o .select() pediu relações embutidas,
  // relê as linhas pelo id para montar os objetos aninhados.
  async _comRelacoes (linhas) {
    const arv = this.arvore
    if (!arv || !arv.relacoes.length || !linhas.length) return this._formatar(linhas)
    const ids = linhas.map(l => l.id).filter(Boolean)
    if (!ids.length) return this._formatar(linhas)
    const q = new Consulta(this.tabela)
    q.colunas = this.colunas
    q.arvore = arv
    q.in('id', ids)
    const r = await q._rodar()
    return this._formatar(r.data || linhas)
  }

  _formatar (linhas) {
    if (this._single) {
      if (!linhas.length) {
        return this._maybe
          ? { data: null, error: null }
          : { data: null, error: { message: 'no rows returned', code: 'PGRST116' } }
      }
      return { data: linhas[0], error: null, count: this._countValor }
    }
    return { data: linhas, error: null, count: this._countValor }
  }

  then (ok, falha) {
    return this._rodar().then(
      r => ok ? ok(r) : r,
      e => {
        const r = { data: null, error: { message: String(e && e.message || e) } }
        return ok ? ok(r) : r
      }
    ).catch(falha)
  }
}

// ---------------------------------------------------------------- RPCs
// As funções que eram plpgsql no Postgres viram JavaScript aqui.
const RPCS = {
  async expirar_pontos_inativos () {
    const d = db()
    const cfg = await d.all("SELECT valor FROM configuracoes WHERE chave='pontos_dias_expirar'", [])
    const dias = parseInt((cfg.results && cfg.results[0] && cfg.results[0].valor) || '90', 10) || 90
    const corte = new Date(Date.now() - dias * 86400000).toISOString()
    const alvo = await d.all(
      `SELECT cp.cliente_id, cp.saldo FROM carteira_pontos cp
        WHERE cp.saldo > 0
          AND NOT EXISTS (SELECT 1 FROM comandas c
                           WHERE c.cliente_id = cp.cliente_id
                             AND c.status = 'finalizada'
                             AND c.finalizada_em > ?)`, [corte])
    const linhas = alvo.results || []
    for (const l of linhas) {
      await d.run(`INSERT INTO historico_pontos (cliente_id, tipo, pontos, descricao) VALUES (?,?,?,?)`,
        [l.cliente_id, 'expiracao', -l.saldo, `Pontos expirados por ${dias} dias sem atendimento`])
      await d.run(`UPDATE carteira_pontos SET saldo = 0 WHERE cliente_id = ?`, [l.cliente_id])
    }
    return linhas.length
  },

  async fichas_disponiveis_cliente ({ p_cliente }) {
    const d = db()
    const agora = new Date().toISOString()
    const r = await d.all(
      `SELECT COALESCE(SUM(MAX(0, quantidade - usadas)), 0) AS n
         FROM fichas_plano WHERE cliente_id = ? AND expira_em > ?`, [p_cliente, agora])
    return (r.results && r.results[0] ? r.results[0].n : 0) || 0
  },

  async consumir_fichas ({ p_cliente, p_qtd }) {
    const d = db()
    const agora = new Date().toISOString()
    let falta = Number(p_qtd) || 0
    const r = await d.all(
      `SELECT id, quantidade, usadas FROM fichas_plano
        WHERE cliente_id = ? AND expira_em > ? AND usadas < quantidade
        ORDER BY expira_em ASC`, [p_cliente, agora])
    for (const f of (r.results || [])) {
      if (falta <= 0) break
      const disp = f.quantidade - f.usadas
      const usa = Math.min(disp, falta)
      await d.run('UPDATE fichas_plano SET usadas = usadas + ? WHERE id = ?', [usa, f.id])
      falta -= usa
    }
    return (Number(p_qtd) || 0) - falta
  },

  async buscar_cliente_por_telefone ({ tel }) {
    const d = db()
    const digitos = String(tel || '').replace(/\D/g, '')
    if (digitos.length < 8) return []
    const fim = digitos.slice(-8)
    const r = await d.all(
      `SELECT * FROM clientes WHERE replace(replace(replace(replace(whatsapp,'(',''),')',''),'-',''),' ','') LIKE ?
        ORDER BY criado_em ASC LIMIT 5`, ['%' + fim])
    return (r.results || []).map(l => {
      const o = {}
      for (const k of Object.keys(l)) o[k] = doSql('clientes', k, l[k])
      return o
    })
  }
}

// ---------------------------------------------------------------- cliente
function criarCliente () {
  return {
    from (tabela) { return new Consulta(tabela) },
    async rpc (nome, args) {
      const fn = RPCS[nome]
      if (!fn) return { data: null, error: { message: `[d1] RPC não implementada: ${nome}` } }
      try { return { data: await fn(args || {}), error: null } } catch (e) {
        return { data: null, error: { message: String(e && e.message || e) } }
      }
    },
    // Supabase Auth não existe no D1. O login virou próprio (config/auth-local.js),
    // mas mantém a MESMA assinatura — as rotas não precisaram mudar.
    // require preguiçoso: auth-local depende deste módulo.
    auth: {
      signInWithPassword (args) { return require('./auth-local').signInWithPassword(args) },
      admin: {
        createUser (args) { return require('./auth-local').createUser(args) },
        updateUserById (id, patch, tabela) { return require('./auth-local').updateUserById(id, patch, tabela) }
      }
    }
  }
}

const supabase = criarCliente()
const supabaseAdmin = criarCliente()

/**
 * Roda um comando SQL cru, SEM parâmetros. Existe por um motivo só: semear.
 * O D1 aceita no máximo 100 parâmetros por consulta, então inserir centenas de
 * linhas com `?` vira dezenas de consultas — e o D1 também conta consultas por
 * invocação. Com os valores escritos direto no SQL, o mesmo lote cabe em uma.
 *
 * ⚠️  NUNCA passe dado vindo do usuário por aqui. Use só com SQL que o próprio
 *     sistema montou (veja src/demo.js), e sempre com paraLiteral() nos valores.
 */
async function executarSql (sql) {
  const d = db()
  // O binding do D1 responde a all() em qualquer comando; o better-sqlite3 dos
  // testes exige run() quando não há linhas para devolver.
  return typeof d.run === 'function' ? d.run(sql, []) : d.all(sql, [])
}

/** Um valor pronto para entrar direto no SQL, com aspas escapadas. */
function paraLiteral (tabela, coluna, v) {
  const x = paraSql(tabela, coluna, v)
  if (x === null || x === undefined) return 'NULL'
  if (typeof x === 'number') return Number.isFinite(x) ? String(x) : 'NULL'
  return "'" + String(x).replace(/'/g, "''") + "'"
}

module.exports = {
  supabase, supabaseAdmin, setDb, RPCS, parseSelect, resolverRelacao, paraSql, doSql,
  marcarAtualizado, aplicarMovimentacaoEstoque, executarSql, paraLiteral
}
