// ============================================================================
// marca.js — identidade da barbearia, vinda do ambiente
//
// O backend NÃO tem marca escrita no código. Nome, cidade, domínio e e-mail
// vêm de variáveis de ambiente. Assim o MESMO repositório serve todas as
// barbearias: cada uma é um deploy com env diferente, e uma correção no
// código chega em todas com um `git push`.
//
// Variáveis (todas opcionais — há fallback neutro para tudo):
//   APP_NOME            "Barbearia Vértice"
//   APP_NOME_CURTO      "Vértice"            (default: 1ª palavra depois de "Barbearia")
//   APP_CIDADE          "Canoas"
//   APP_UF              "RS"
//   APP_SITE            "barbeariavertice.com.br"   (só o host, sem https://)
//   APP_EMAIL_CONTATO   "contato@barbeariavertice.com.br"
//   APP_PREFIXO         "appvertice"         (prefixo dos HTMLs do painel)
//   SENHA_TEMP_PADRAO   senha temporária ao criar colaborador
// ============================================================================

const nome = (process.env.APP_NOME || 'Barbearia').trim()

const nomeCurto = (process.env.APP_NOME_CURTO ||
  nome.replace(/^(barbearia|barber shop|barbershop|studio)\s+/i, '') || nome).trim()

const cidade = (process.env.APP_CIDADE || '').trim()
const uf = (process.env.APP_UF || '').trim().toUpperCase()

// "Canoas/RS", ou só "Canoas", ou string vazia — nunca "undefined/undefined"
const cidadeUf = cidade && uf ? `${cidade}/${uf}` : (cidade || '')

const site = (process.env.APP_SITE || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
const siteUrl = site ? `https://${site}` : ''

const emailContato = (process.env.APP_EMAIL_CONTATO || (site ? `contato@${site}` : 'contato@example.com')).trim()

const prefixoApp = (process.env.APP_PREFIXO || 'app').trim()

// deep link do push para uma tela do painel: '/appvertice-dashboard'
function tela (nomeDaTela) { return `/${prefixoApp}-${nomeDaTela}` }

const senhaTempPadrao = process.env.SENHA_TEMP_PADRAO || 'Trocar@123'

// Frase de local para prompts de IA: " em Canoas/RS" ou "" (com o espaço na medida)
const emCidade = cidadeUf ? ` em ${cidadeUf}` : ''

module.exports = {
  nome, nomeCurto, cidade, uf, cidadeUf, emCidade,
  site, siteUrl, emailContato, prefixoApp, tela, senhaTempPadrao
}
