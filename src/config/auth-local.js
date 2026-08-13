// ============================================================================
// auth-local.js — autenticação própria, no lugar do Supabase Auth
//
// O Supabase Auth não existe no D1. Este módulo faz o mesmo trabalho usando o
// que o schema já tinha: a coluna `senha_hash` em `colaboradores` e `clientes`.
//
// A API imita a do Supabase (`signInWithPassword`, `admin.createUser`,
// `admin.updateUserById`) para as rotas não precisarem mudar de forma.
//
// Diferença que importa: no Supabase o `user_id` vinha de `auth.users`.
// Aqui o próprio `id` da linha é o identificador — e o login preenche
// `user_id = id` quando estiver vazio, para o código antigo continuar valendo.
// ============================================================================

const bcrypt = require('bcryptjs')
const { supabaseAdmin } = require('./d1')

const CUSTO = parseInt(process.env.BCRYPT_ROUNDS || '10', 10)

async function gerarHash (senha) {
  return bcrypt.hash(String(senha), CUSTO)
}

async function conferir (senha, hash) {
  if (!hash) return false
  try { return await bcrypt.compare(String(senha), String(hash)) } catch (e) { return false }
}

// Procura o e-mail em colaboradores e, se não achar, em clientes.
async function acharPorEmail (email) {
  const e = String(email || '').toLowerCase().trim()
  if (!e) return null

  const { data: colab } = await supabaseAdmin
    .from('colaboradores')
    .select('id, nome, email, perfil, unidade_id, foto_url, senha_hash, ativo, user_id')
    .ilike('email', e).limit(1)
  if (colab && colab.length) return { tipo: 'colaborador', linha: colab[0] }

  const { data: cli } = await supabaseAdmin
    .from('clientes')
    .select('id, nome, email, whatsapp, senha_hash, ativo, user_id')
    .ilike('email', e).limit(1)
  if (cli && cli.length) return { tipo: 'cliente', linha: cli[0] }

  return null
}

/**
 * Mesma assinatura do Supabase: { data, error }.
 * Sucesso: { data: { user: { id, email }, perfil, usuario }, error: null }
 */
async function signInWithPassword ({ email, password }) {
  const achado = await acharPorEmail(email)
  if (!achado) return { data: null, error: { message: 'E-mail ou senha incorretos' } }

  const u = achado.linha
  if (u.ativo === false) return { data: null, error: { message: 'Usuário inativo' } }
  if (!(await conferir(password, u.senha_hash))) {
    return { data: null, error: { message: 'E-mail ou senha incorretos' } }
  }

  // Retrocompatibilidade: no Postgres o vínculo era pelo auth.users.
  if (!u.user_id) {
    const tabela = achado.tipo === 'colaborador' ? 'colaboradores' : 'clientes'
    await supabaseAdmin.from(tabela).update({ user_id: u.id }).eq('id', u.id)
    u.user_id = u.id
  }

  return {
    data: {
      user: { id: u.user_id || u.id, email: u.email },
      perfil: achado.tipo === 'colaborador' ? u.perfil : 'cliente',
      usuario: u
    },
    error: null
  }
}

/** Cria/atualiza a senha de um usuário. Substitui auth.admin.createUser. */
async function createUser ({ email, password, tabela = 'colaboradores' }) {
  const hash = await gerarHash(password)
  const { data } = await supabaseAdmin.from(tabela)
    .select('id').ilike('email', String(email || '').toLowerCase().trim()).limit(1)
  if (data && data.length) {
    await supabaseAdmin.from(tabela).update({ senha_hash: hash, user_id: data[0].id }).eq('id', data[0].id)
    return { data: { user: { id: data[0].id, email } }, error: null }
  }
  // Sem linha ainda: quem chama cria o cadastro e depois define a senha.
  return { data: { user: { id: null, email }, senha_hash: hash }, error: null }
}

/** Troca a senha. Substitui auth.admin.updateUserById. */
async function updateUserById (id, patch, tabela = 'colaboradores') {
  if (!patch || !patch.password) return { data: null, error: { message: 'nada a atualizar' } }
  const hash = await gerarHash(patch.password)
  const r = await supabaseAdmin.from(tabela).update({ senha_hash: hash }).eq('id', id).select('id')
  if (r.error) return { data: null, error: r.error }
  if (!r.data || !r.data.length) {
    const r2 = await supabaseAdmin.from(tabela).update({ senha_hash: hash }).eq('user_id', id).select('id')
    if (!r2.data || !r2.data.length) return { data: null, error: { message: 'usuário não encontrado' } }
  }
  return { data: { user: { id } }, error: null }
}

module.exports = { signInWithPassword, createUser, updateUserById, gerarHash, conferir, acharPorEmail }
