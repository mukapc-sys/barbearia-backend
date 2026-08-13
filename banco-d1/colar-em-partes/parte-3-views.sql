DROP VIEW IF EXISTS vw_agenda_dia;
CREATE VIEW vw_agenda_dia AS
SELECT a.id, a.data_hora_ini, a.data_hora_fim, a.status, a.valor, a.observacao, a.canal_origem,
       u.nome  AS unidade_nome,
       col.nome AS colaborador_nome,
       COALESCE(cli.nome, a.cliente_nome) AS cliente_nome,
       cli.whatsapp AS cliente_whatsapp,
       s.nome AS servico_nome, s.duracao_min,
       a.colaborador_id, a.unidade_id, a.cliente_id
  FROM agendamentos a
  LEFT JOIN unidades      u   ON u.id   = a.unidade_id
  LEFT JOIN colaboradores col ON col.id = a.colaborador_id
  LEFT JOIN clientes      cli ON cli.id = a.cliente_id
  LEFT JOIN servicos      s   ON s.id   = a.servico_id;

DROP VIEW IF EXISTS vw_financeiro_dia;
CREATE VIEW vw_financeiro_dia AS
SELECT c.unidade_id, u.nome AS unidade_nome,
       substr(datetime(c.finalizada_em, '-3 hours'), 1, 10) AS data,
       COUNT(*) AS total_comandas,
       COALESCE(SUM(c.total), 0) AS faturamento,
       COALESCE(SUM(CASE WHEN c.forma_pgto = 'dinheiro' THEN c.total ELSE 0 END), 0) AS total_dinheiro,
       COALESCE(SUM(CASE WHEN c.forma_pgto = 'debito'   THEN c.total ELSE 0 END), 0) AS total_debito,
       COALESCE(SUM(CASE WHEN c.forma_pgto = 'credito'  THEN c.total ELSE 0 END), 0) AS total_credito,
       COALESCE(SUM(CASE WHEN c.forma_pgto = 'pix'      THEN c.total ELSE 0 END), 0) AS total_pix
  FROM comandas c
  JOIN unidades u ON u.id = c.unidade_id
 WHERE c.status = 'finalizada' AND c.finalizada_em IS NOT NULL
 GROUP BY c.unidade_id, u.nome, data;

DROP VIEW IF EXISTS vw_comissoes_mes;
CREATE VIEW vw_comissoes_mes AS
SELECT col.id AS colaborador_id, col.nome AS colaborador_nome, col.comissao_pct,
       u.nome AS unidade_nome,
       substr(c.finalizada_em, 1, 7) AS mes,
       COUNT(*) AS total_comandas,
       COALESCE(SUM(c.total), 0) AS faturado,
       COALESCE(SUM(c.total) * COALESCE(col.comissao_pct, 0) / 100.0, 0) AS comissao
  FROM comandas c
  JOIN colaboradores col ON col.id = c.colaborador_id
  LEFT JOIN unidades  u  ON u.id  = c.unidade_id
 WHERE c.status = 'finalizada' AND c.finalizada_em IS NOT NULL
 GROUP BY col.id, col.nome, col.comissao_pct, u.nome, mes;

DROP VIEW IF EXISTS vw_estoque_alertas;
CREATE VIEW vw_estoque_alertas AS
SELECT p.id AS produto_id, p.nome AS produto_nome, p.estoque_minimo,
       e.unidade_id, u.nome AS unidade_nome, e.quantidade,
       CASE WHEN e.quantidade <= p.estoque_minimo THEN 1 ELSE 0 END AS critico
  FROM estoque e
  JOIN produtos p ON p.id = e.produto_id
  JOIN unidades u ON u.id = e.unidade_id
 WHERE p.ativo = 1;

DROP VIEW IF EXISTS vw_clientes_reativar;
CREATE VIEW vw_clientes_reativar AS
SELECT cli.id, cli.nome, cli.whatsapp,
       MAX(c.finalizada_em) AS ultima_visita,
       CAST(julianday('now') - julianday(MAX(c.finalizada_em)) AS INTEGER) AS dias_ausente,
       col.nome AS colaborador_preferido,
       cli.colaborador_pref AS colaborador_id
  FROM clientes cli
  LEFT JOIN comandas      c   ON c.cliente_id = cli.id AND c.status = 'finalizada'
  LEFT JOIN colaboradores col ON col.id = cli.colaborador_pref
 WHERE cli.ativo = 1 AND cli.arquivado_em IS NULL
 GROUP BY cli.id, cli.nome, cli.whatsapp, col.nome, cli.colaborador_pref
HAVING MAX(c.finalizada_em) IS NULL
    OR MAX(c.finalizada_em) < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days');

INSERT OR IGNORE INTO perfis_acesso (chave, nome, base, fixo) VALUES
  ('proprietario','Proprietário','proprietario',1),
  ('gerente',     'Gerente',     'gerente',     1),
  ('caixa',       'Caixa',       'caixa',       1),
  ('colaborador', 'Colaborador', 'colaborador', 1),
  ('funcionario', 'Funcionário', 'funcionario', 1),
  ('cliente',     'Cliente',     'cliente',     1);