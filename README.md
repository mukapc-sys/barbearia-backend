# Backend — API de gestão para barbearias

API REST em Node/Express sobre Supabase. **Sem marca no código**: nome, cidade,
domínio e e-mail vêm de variáveis de ambiente (`src/config/marca.js`).

Na prática: **um repositório serve todas as barbearias**. Cada cliente é um
deploy com env diferente. Uma correção no código chega em todos com um
`git push` — não existe fork por cliente.

## Rodar local

```bash
npm install
cp .env.example .env      # preencha as chaves do Supabase
npm run dev
curl http://localhost:3001/health
```

## Variáveis de ambiente

### Obrigatórias

| Variável | Onde achar |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Settings → API → `anon public` |
| `SUPABASE_SERVICE_KEY` | Settings → API → `service_role` — **nunca exponha no front** |
| `JWT_SECRET` | string aleatória longa, uma por barbearia |

### Identidade (define de quem é este deploy)

| Variável | Exemplo | Aparece em |
|---|---|---|
| `APP_NOME` | `Barbearia Vértice` | mensagens de WhatsApp, push, e-mail, prompts da IA |
| `APP_NOME_CURTO` | `Vértice` | textos curtos |
| `APP_CIDADE` / `APP_UF` | `Canoas` / `RS` | SEO e contexto da IA |
| `APP_SITE` | `barbeariavertice.com.br` | links enviados ao cliente (só o host) |
| `APP_EMAIL_CONTATO` | `contato@…` | remetente do push (VAPID subject) |
| `APP_PREFIXO` | `appvertice` | deep link do push para o painel |
| `SENHA_TEMP_PADRAO` | `Trocar@123` | senha ao criar colaborador |

Sem nenhuma delas o sistema sobe igual, só genérico ("Barbearia").

### Opcionais

| Variável | Para quê |
|---|---|
| `WEBHOOK_TOKEN` | **segredo do `/whatsapp/webhook`.** Sem ele o webhook fica aberto |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE` | recepcionista de WhatsApp |
| `WHATSAPP_TESTE_NUMERO` | responde só a esse número enquanto testa |
| `VAPID_PUBLIC` / `VAPID_PRIVATE` | push. Gere com `npx web-push generate-vapid-keys` |
| `GEMINI_API_KEY` | assistente de IA |
| `ADMIN_SENHA` | área administrativa do acervo |
| `PORT` | padrão 3001 |

## Deploy na Railway

1. Suba este diretório num repositório do GitHub
2. Railway → **New Project → Deploy from GitHub** → escolha o repositório
3. **Variables** → cole o conteúdo do `.env` gerado
4. O `railway.json` já configura start, health check em `/health` e restart
5. **Settings → Networking → Generate Domain**, ou aponte `api.<dominio-do-cliente>`

Para o próximo cliente: **New Project a partir do mesmo repositório**, env
diferente. O código não muda.

## Segurança

- Toda rota exige `Authorization: Bearer <jwt>`, exceto `/auth/*`, `/publico/*` e `/whatsapp/webhook`.
- `/whatsapp/*` exige login (o painel de conversas era aberto e foi fechado).
- `/config/:chave` — leitura exige login, escrita exige perfil `proprietario`.
- `SUPABASE_SERVICE_KEY` ignora RLS: nunca coloque no front.
- **CORS está liberado para qualquer origem** (`server.js`). Restrinja aos
  domínios do cliente antes de ir a produção com dado real.

## Rotas principais

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | status do serviço (usado pela Railway) |
| POST | `/auth/login` | login do painel (Supabase Auth) |
| GET | `/dashboard/agenda-dia` | agenda do dia |
| GET | `/dashboard/metricas` | painel, varia por perfil |
| POST/PUT | `/comandas`, `/comandas/:id/finalizar` | atendimento |
| GET | `/financeiro/resumo` | faturamento, comissões, líquido |
| GET | `/metas/progresso` | metas de unidade e por barbeiro |
| GET | `/fechamento` | contracheque do colaborador |
| POST | `/publico/agendar` | agendamento pelo app do cliente |
| GET | `/config` | regras de negócio em vigor |
