// ============================================================================
// supabase.js — mantido só como PONTE.
//
// As 26 rotas fazem `require('../config/supabase')`. Em vez de editar todas,
// este arquivo repassa os clientes da camada D1, que imita a API do supabase-js.
// Nenhuma rota precisou mudar.
//
// Para voltar ao Supabase de verdade um dia, é só trocar o require abaixo.
// ============================================================================
const { supabase, supabaseAdmin, setDb } = require('./d1')

module.exports = { supabase, supabaseAdmin, setDb }
