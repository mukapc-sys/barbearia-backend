# banco-d1

Gerado por `ferramentas/montar-schema-d1.js` a partir do inventário de colunas
do Postgres de origem. **Não edite `01-schema.sql` à mão** — rode o gerador.

## Como subir

Pelo Console do D1 (é o que o PASSO-A-PASSO manda fazer): abra `01-schema.sql`,
copie tudo, cole e Execute. Se o Console reclamar de tamanho, use os três
arquivos de `colar-em-partes/` na ordem — dá o mesmo banco.

Por linha de comando:

    npx wrangler d1 execute <BANCO> --remote --file=banco-d1/01-schema.sql

## Regras do arquivo

Nada de comentário, nada de trigger. O Console do D1 quebra o texto colado em
comandos: um pedaço só com `--` vira "Requests without any query are not
supported", e o `BEGIN ...; ...; END;` de um trigger é partido no meio. Aqui
**todo `;` termina um comando de verdade** — por isso cola em qualquer lugar.
O gerador falha de propósito se algum comentário ou trigger reaparecer.

## O que era trigger e agora é código

Vive em `backend/src/config/d1.js`, com teste em `testes/d1.test.js`:

| Antes (Postgres) | Agora |
|---|---|
| `ON UPDATE now()` em 21 tabelas | `marcarAtualizado()` — carimba `atualizado_em` em todo update/upsert |
| trigger de saldo em `movimentacoes_estoque` | `aplicarMovimentacaoEstoque()` — cria a linha de `estoque` e soma/subtrai |

Consequência: quem mexer no banco **por fora da aplicação** (Console, wrangler)
não dispara essas duas regras. Movimentação de estoque na mão pede acerto do
saldo na mão.

## Postgres ↔ SQLite

| Postgres | D1 |
|---|---|
| `boolean` | `INTEGER` 0/1 |
| `jsonb` | `TEXT` com JSON |
| `numeric` | `REAL` |
| `uuid` | `TEXT` (o default gera v4) |
| `timestamptz` | `TEXT` ISO-8601 em UTC |
| `enum` | `TEXT` + `CHECK` |

A camada `d1.js` converte nos dois sentidos — as rotas não percebem.
