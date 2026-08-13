PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agenda_appbarber (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  appbarber_id TEXT NOT NULL,
  unidade_id TEXT,
  tipo TEXT,
  status TEXT,
  cod_status INTEGER,
  cliente_nome TEXT,
  cliente_celular TEXT,
  cliente_codigo TEXT,
  cliente_id TEXT,
  profissional_appbarber_id TEXT,
  colaborador_id TEXT,
  servico_texto TEXT,
  servico_appbarber_id TEXT,
  servico_id TEXT,
  inicio TEXT,
  fim TEXT,
  valor REAL DEFAULT 0,
  observacao TEXT,
  confirmado INTEGER DEFAULT 0 CHECK (confirmado IS NULL OR confirmado IN (0,1)),
  encaixe INTEGER DEFAULT 0 CHECK (encaixe IS NULL OR encaixe IN (0,1)),
  cor TEXT,
  comanda_codigo TEXT,
  pendente_vinculo INTEGER DEFAULT 0 CHECK (pendente_vinculo IS NULL OR pendente_vinculo IN (0,1)),
  sincronizado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finalizado INTEGER NOT NULL DEFAULT 0 CHECK (finalizado IS NULL OR finalizado IN (0,1)),
  finalizado_em TEXT,
  finalizado_onde TEXT,
  agendamento_id TEXT,
  comanda_id TEXT,
  editado_local INTEGER DEFAULT 0 CHECK (editado_local IS NULL OR editado_local IN (0,1)),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL,
  FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS agenda_appbarber_produtos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  appbarber_item_id TEXT,
  comanda_codigo TEXT,
  unidade_id TEXT,
  colaborador_id TEXT,
  cliente_codigo TEXT,
  descricao TEXT,
  quantidade REAL DEFAULT 1,
  valor_unit REAL DEFAULT 0,
  comissao REAL DEFAULT 0,
  data TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  colaborador_id TEXT NOT NULL,
  cliente_id TEXT,
  servico_id TEXT NOT NULL,
  data_hora_ini TEXT NOT NULL,
  data_hora_fim TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IS NULL OR status IN ('agendado', 'confirmado', 'andamento', 'concluido', 'cancelado', 'nao_compareceu', 'bloqueado')),
  valor REAL NOT NULL DEFAULT 0,
  observacao TEXT,
  canal_origem TEXT DEFAULT 'sistema',
  criado_por TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  comanda_id TEXT,
  nome_acompanhante TEXT,
  pago INTEGER DEFAULT 0 CHECK (pago IS NULL OR pago IN (0,1)),
  encaixe INTEGER DEFAULT 0 CHECK (encaixe IS NULL OR encaixe IN (0,1)),
  cliente_nome TEXT,
  bloqueio_grupo TEXT,
  transferencia_resolvida INTEGER DEFAULT 0 CHECK (transferencia_resolvida IS NULL OR transferencia_resolvida IN (0,1)),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS appbarber_depara_profissional (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  appbarber_id TEXT NOT NULL,
  appbarber_nome TEXT,
  colaborador_id TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS appbarber_depara_servico (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  appbarber_id TEXT NOT NULL,
  appbarber_nome TEXT,
  servico_id TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS appbarber_sessoes (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  cookie TEXT,
  expira_em TEXT,
  status TEXT DEFAULT 'desconectado',
  atualizado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assinaturas (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  cliente_id TEXT NOT NULL,
  plano_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IS NULL OR status IN ('ativa', 'vencida', 'suspensa', 'cancelada')),
  data_inicio TEXT NOT NULL,
  data_renovacao TEXT NOT NULL,
  forma_pgto TEXT CHECK (forma_pgto IS NULL OR forma_pgto IN ('dinheiro', 'pix', 'debito', 'credito', 'outros')),
  cartao_token TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  credito_mensal REAL DEFAULT 0,
  credito_saldo REAL DEFAULT 0,
  credito_reset_dia INTEGER DEFAULT 1,
  vendedor_id TEXT,
  comissao_vendedor_pct REAL,
  vendedor_id_2 TEXT,
  valor_split_1 REAL,
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE RESTRICT,
  FOREIGN KEY (vendedor_id) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (vendedor_id_2) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS balanco_itens (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  balanco_id TEXT NOT NULL,
  produto_id TEXT NOT NULL,
  produto_nome TEXT,
  saldo_sistema REAL DEFAULT 0,
  contagem_fisica REAL DEFAULT 0,
  diferenca REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  resolvido_por TEXT,
  resolvido_em TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (balanco_id) REFERENCES balancos(id) ON DELETE RESTRICT,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT,
  FOREIGN KEY (resolvido_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS balancos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  criado_por TEXT,
  criado_por_nome TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  concluido_em TEXT,
  observacao TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bloqueios (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT NOT NULL,
  unidade_id TEXT NOT NULL,
  data_ini TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  dia_inteiro INTEGER NOT NULL DEFAULT 0 CHECK (dia_inteiro IS NULL OR dia_inteiro IN (0,1)),
  recorrencia TEXT NOT NULL DEFAULT 'unico' CHECK (recorrencia IS NULL OR recorrencia IN ('unico', 'diario', 'semanal', 'mensal')),
  motivo TEXT,
  criado_por TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bloqueios_recorrentes (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT NOT NULL,
  unidade_id TEXT,
  dias_semana TEXT NOT NULL,
  hora_ini TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  data_ini TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  motivo TEXT,
  criado_por TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS caixa_retiradas (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  sessao_id TEXT,
  unidade_id TEXT,
  valor REAL NOT NULL,
  motivo TEXT,
  responsavel_id TEXT,
  responsavel_nome TEXT,
  autorizado_por TEXT,
  autorizado_por_nome TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (sessao_id) REFERENCES caixa_sessoes(id) ON DELETE SET NULL,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (autorizado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS caixa_sessoes (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  saldo_inicial REAL DEFAULT 0,
  aberto_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  aberto_por TEXT,
  aberto_por_nome TEXT,
  fechado_em TEXT,
  fechado_por TEXT,
  fechado_por_nome TEXT,
  dinheiro_conferido REAL,
  faturamento REAL,
  observacao TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (aberto_por) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (fechado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS carteira_pontos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  cliente_id TEXT NOT NULL,
  saldo INTEGER NOT NULL DEFAULT 0,
  total_acumulado INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expira_em TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS categorias_produto (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  nome TEXT NOT NULL,
  paga_comissao INTEGER NOT NULL DEFAULT 1 CHECK (paga_comissao IS NULL OR paga_comissao IN (0,1)),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS cliente_dedup_map (
  dup_id TEXT NOT NULL,
  manter_id TEXT NOT NULL,
  tel TEXT,
  nome_norm TEXT,
  PRIMARY KEY (dup_id),
  FOREIGN KEY (dup_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (manter_id) REFERENCES clientes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS cliente_servicos_pref (
  cliente_id TEXT NOT NULL,
  servico_id TEXT NOT NULL,
  PRIMARY KEY (cliente_id, servico_id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT,
  nome TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  whatsapp TEXT,
  data_nasc TEXT,
  colaborador_pref TEXT,
  unidade_pref TEXT,
  observacoes TEXT,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  convenio_id TEXT,
  origem TEXT DEFAULT 'sistema',
  senha_hash TEXT,
  reset_codigo TEXT,
  reset_expira TEXT,
  appbarber_codigo TEXT,
  emails_extras TEXT DEFAULT '{}',
  arquivado_em TEXT,
  arquivado_motivo TEXT,
  foto_url TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_pref) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (unidade_pref) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cobrancas_assinatura (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  assinatura_id TEXT NOT NULL,
  valor REAL NOT NULL,
  data_cobranca TEXT NOT NULL,
  forma_pgto TEXT CHECK (forma_pgto IS NULL OR forma_pgto IN ('dinheiro', 'pix', 'debito', 'credito', 'outros')),
  status TEXT NOT NULL DEFAULT 'pendente',
  gateway_id TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS colaborador_servico_tempo (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT,
  servico_id TEXT,
  duracao_min INTEGER NOT NULL,
  atualizado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS colaborador_servicos (
  colaborador_id TEXT NOT NULL,
  servico_id TEXT NOT NULL,
  PRIMARY KEY (colaborador_id, servico_id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS colaboradores (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT,
  nome TEXT NOT NULL,
  cpf TEXT,
  email TEXT NOT NULL,
  whatsapp TEXT,
  data_nasc TEXT,
  perfil TEXT NOT NULL DEFAULT 'colaborador' CHECK (perfil IS NULL OR perfil IN ('proprietario', 'gerente', 'caixa', 'colaborador', 'funcionario', 'cliente')),
  unidade_id TEXT,
  comissao_pct REAL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  foto_url TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  nivel TEXT DEFAULT 'mid' CHECK (nivel IS NULL OR nivel IN ('jr', 'mid', 'sr')),
  senha_hash TEXT,
  saldo_vales_pix REAL DEFAULT 0,
  foto_url_2 TEXT,
  senha_autorizacao TEXT,
  salario REAL DEFAULT 0,
  mostrar_sobrenome INTEGER DEFAULT 0 CHECK (mostrar_sobrenome IS NULL OR mostrar_sobrenome IN (0,1)),
  demitido_em TEXT,
  is_subgerente INTEGER DEFAULT 0 CHECK (is_subgerente IS NULL OR is_subgerente IN (0,1)),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comandas (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  agendamento_id TEXT,
  unidade_id TEXT NOT NULL,
  colaborador_id TEXT NOT NULL,
  cliente_id TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IS NULL OR status IN ('aberta', 'em_atendimento', 'finalizada', 'cancelada')),
  subtotal REAL NOT NULL DEFAULT 0,
  desconto REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  forma_pgto TEXT CHECK (forma_pgto IS NULL OR forma_pgto IN ('dinheiro', 'pix', 'debito', 'credito', 'outros')),
  observacao TEXT,
  aberta_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finalizada_em TEXT,
  criado_por TEXT,
  status_pagamento TEXT DEFAULT 'aberta',
  pagamentos TEXT,
  cliente_nome TEXT,
  pontos_resgatados INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comissoes_planos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  assinatura_id TEXT NOT NULL,
  colaborador_id TEXT NOT NULL,
  valor_plano REAL NOT NULL,
  pct_comissao REAL NOT NULL,
  valor_comissao REAL NOT NULL,
  mes TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE RESTRICT,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  descricao TEXT,
  atualizado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (chave)
);

CREATE TABLE IF NOT EXISTS convenios (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  desconto_pct REAL NOT NULL DEFAULT 15,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS dre_lancamentos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  mes TEXT NOT NULL,
  tipo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor REAL NOT NULL DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  atualizado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS email_fila (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  cliente_id TEXT,
  email TEXT NOT NULL,
  nome TEXT,
  segmento TEXT,
  prioridade INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pendente',
  resend_id TEXT,
  erro_msg TEXT,
  enviado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS espera_colaboradores (
  espera_id TEXT NOT NULL,
  colaborador_id TEXT NOT NULL,
  PRIMARY KEY (espera_id, colaborador_id),
  FOREIGN KEY (espera_id) REFERENCES lista_espera(id) ON DELETE RESTRICT,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS estoque (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  produto_id TEXT NOT NULL,
  unidade_id TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS fechamentos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT NOT NULL,
  unidade_id TEXT,
  periodo_ini TEXT NOT NULL,
  periodo_fim TEXT NOT NULL,
  servico_total REAL DEFAULT 0,
  servico_pct REAL DEFAULT 0,
  servico_comissao REAL DEFAULT 0,
  produto_total REAL DEFAULT 0,
  produto_pct REAL DEFAULT 0,
  produto_comissao REAL DEFAULT 0,
  comissao_bruta REAL DEFAULT 0,
  vales_adiantamento REAL DEFAULT 0,
  vales_produtos REAL DEFAULT 0,
  total_descontos REAL DEFAULT 0,
  liquido REAL DEFAULT 0,
  detalhe TEXT,
  emitido_por TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (emitido_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fechamentos_caixa (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  data_fechamento TEXT NOT NULL,
  responsavel_id TEXT,
  total_dinheiro REAL NOT NULL DEFAULT 0,
  total_debito REAL NOT NULL DEFAULT 0,
  total_credito REAL NOT NULL DEFAULT 0,
  total_pix REAL NOT NULL DEFAULT 0,
  total_sangria REAL NOT NULL DEFAULT 0,
  total_comandas INTEGER NOT NULL DEFAULT 0,
  faturamento_bruto REAL NOT NULL DEFAULT 0,
  total_comissoes REAL NOT NULL DEFAULT 0,
  observacao TEXT,
  enviado_email INTEGER NOT NULL DEFAULT 0 CHECK (enviado_email IS NULL OR enviado_email IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feriados (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  data TEXT NOT NULL,
  descricao TEXT,
  criado_por TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  fechado INTEGER DEFAULT 0 CHECK (fechado IS NULL OR fechado IN (0,1)),
  hora_abre TEXT,
  hora_fecha TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fichas_plano (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  cliente_id TEXT NOT NULL,
  assinatura_id TEXT,
  plano_id TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  usadas INTEGER NOT NULL DEFAULT 0,
  gerada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expira_em TEXT NOT NULL,
  origem TEXT DEFAULT 'renovacao',
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE SET NULL,
  FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS folgas (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT,
  unidade_id TEXT,
  data_folga TEXT NOT NULL,
  periodo TEXT DEFAULT 'dia_todo',
  status TEXT DEFAULT 'aprovada',
  aprovado_por TEXT,
  obs TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (aprovado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gatilhos_comissao_produto (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  qtd_min INTEGER NOT NULL,
  qtd_max INTEGER,
  comissao_pct REAL NOT NULL,
  ativo INTEGER DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS gatilhos_comissao_servico (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  faturamento_min REAL NOT NULL,
  faturamento_max REAL,
  comissao_pct REAL NOT NULL,
  ativo INTEGER DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS historico_atendimentos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT,
  cliente_id TEXT,
  colaborador_id TEXT,
  servico_id TEXT,
  data_hora_ini TEXT,
  valor REAL DEFAULT 0,
  forma_pgto TEXT,
  status TEXT DEFAULT 'concluido',
  pontos_gerados INTEGER DEFAULT 0,
  origem TEXT DEFAULT 'sistema',
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS historico_pontos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  cliente_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  pontos INTEGER NOT NULL,
  descricao TEXT,
  referencia_id TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS horarios_unidade (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  dia_semana INTEGER NOT NULL,
  hora_inicio TEXT,
  hora_fim TEXT,
  aberto INTEGER NOT NULL DEFAULT 1 CHECK (aberto IS NULL OR aberto IN (0,1)),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS itens_comanda (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  comanda_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IS NULL OR tipo IN ('servico', 'produto', 'plano')),
  servico_id TEXT,
  produto_id TEXT,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unit REAL NOT NULL,
  valor_total REAL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  colaborador_id TEXT,
  ficha_bar INTEGER DEFAULT 0 CHECK (ficha_bar IS NULL OR ficha_bar IN (0,1)),
  valor_tabela REAL,
  PRIMARY KEY (id),
  FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS itens_vale (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  vale_id TEXT NOT NULL,
  descricao TEXT NOT NULL,
  produto_id TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unit REAL NOT NULL,
  valor_total REAL,
  PRIMARY KEY (id),
  FOREIGN KEY (vale_id) REFERENCES vales_funcionarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  categoria TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  descricao TEXT,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS lista_espera (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  cliente_id TEXT NOT NULL,
  unidade_id TEXT NOT NULL,
  servico_id TEXT,
  data_desejada TEXT NOT NULL,
  hora_ini TEXT,
  hora_fim TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IS NULL OR status IN ('aguardando', 'atendido', 'cancelado')),
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS log_reaberturas (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  comanda_id TEXT,
  gerente_id TEXT,
  motivo TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE SET NULL,
  FOREIGN KEY (gerente_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS metas_colaborador (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT NOT NULL,
  unidade_id TEXT NOT NULL,
  mes TEXT NOT NULL,
  clientes REAL DEFAULT 0,
  faturamento REAL DEFAULT 0,
  produtos REAL DEFAULT 0,
  planos REAL DEFAULT 0,
  bar REAL DEFAULT 0,
  criado_por TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS metas_unidade (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  mes TEXT NOT NULL,
  clientes REAL DEFAULT 0,
  faturamento REAL DEFAULT 0,
  produtos REAL DEFAULT 0,
  planos REAL DEFAULT 0,
  bar REAL DEFAULT 0,
  criado_por TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  produto_id TEXT NOT NULL,
  unidade_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IS NULL OR tipo IN ('entrada', 'saida', 'saida_venda', 'ajuste')),
  quantidade INTEGER NOT NULL,
  valor_unitario REAL,
  responsavel_id TEXT,
  referencia_id TEXT,
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS nivel_tempo_servico (
  nivel TEXT NOT NULL CHECK (nivel IS NULL OR nivel IN ('jr', 'mid', 'sr')),
  duracao_min INTEGER NOT NULL,
  PRIMARY KEY (nivel)
);

CREATE TABLE IF NOT EXISTS notificacoes_whatsapp (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  destinatario TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL,
  referencia_id TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  tentativas INTEGER NOT NULL DEFAULT 0,
  enviado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS perfis_acesso (
  chave TEXT NOT NULL,
  nome TEXT NOT NULL,
  base TEXT NOT NULL,
  fixo INTEGER NOT NULL DEFAULT 0 CHECK (fixo IS NULL OR fixo IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (chave)
);

CREATE TABLE IF NOT EXISTS permissoes_funcao (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  perfil TEXT NOT NULL,
  funcao TEXT NOT NULL,
  permitido INTEGER NOT NULL DEFAULT 1 CHECK (permitido IS NULL OR permitido IN (0,1)),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS permissoes_tela (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  perfil TEXT NOT NULL,
  tela TEXT NOT NULL,
  permitido INTEGER NOT NULL DEFAULT 1 CHECK (permitido IS NULL OR permitido IN (0,1)),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS plano_servicos (
  plano_id TEXT NOT NULL,
  servico_id TEXT NOT NULL,
  limite_mes INTEGER,
  PRIMARY KEY (plano_id, servico_id),
  FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS planos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_mensal REAL NOT NULL,
  dia_renovacao INTEGER,
  renovacao_automatica INTEGER NOT NULL DEFAULT 1 CHECK (renovacao_automatica IS NULL OR renovacao_automatica IN (0,1)),
  desconto_produtos_pct REAL NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  visitas_semana INTEGER NOT NULL DEFAULT 1,
  fichas_bar_mes INTEGER NOT NULL DEFAULT 4,
  beneficiarios INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS produtos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  nome TEXT NOT NULL,
  categoria_id TEXT,
  barcode TEXT,
  valor_venda REAL NOT NULL DEFAULT 0,
  valor_consumo REAL NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  disponivel_venda INTEGER NOT NULL DEFAULT 1 CHECK (disponivel_venda IS NULL OR disponivel_venda IN (0,1)),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  pontos_resgate INTEGER DEFAULT 0,
  valor_colaborador REAL,
  PRIMARY KEY (id),
  FOREIGN KEY (categoria_id) REFERENCES categorias_produto(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS push_inscricoes (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  cliente_id TEXT,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  ativo INTEGER DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ultimo_envio TEXT,
  colaborador_id TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS push_lembretes (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  agendamento_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  enviado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS saidas_caixa (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  motivo TEXT NOT NULL,
  valor REAL NOT NULL,
  descricao TEXT,
  responsavel_id TEXT,
  autorizado_por TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (autorizado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sangrias (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  unidade_id TEXT NOT NULL,
  responsavel_id TEXT,
  valor REAL NOT NULL,
  motivo TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (responsavel_id) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS servicos (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  nome TEXT NOT NULL,
  descricao TEXT,
  duracao_min INTEGER NOT NULL DEFAULT 30,
  valor REAL NOT NULL,
  disponivel_online INTEGER NOT NULL DEFAULT 1 CHECK (disponivel_online IS NULL OR disponivel_online IN (0,1)),
  todos_colaboradores INTEGER NOT NULL DEFAULT 1 CHECK (todos_colaboradores IS NULL OR todos_colaboradores IN (0,1)),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IS NULL OR ativo IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  restrito_barbeiro INTEGER DEFAULT 0 CHECK (restrito_barbeiro IS NULL OR restrito_barbeiro IN (0,1)),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS unidades (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT NOT NULL DEFAULT 'Montenegro',
  uf TEXT NOT NULL DEFAULT 'RS',
  cep TEXT,
  telefone TEXT,
  email TEXT,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IS NULL OR ativa IN (0,1)),
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS uso_plano_mes (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  assinatura_id TEXT NOT NULL,
  servico_id TEXT NOT NULL,
  ano_mes TEXT NOT NULL,
  quantidade_usada INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS vales (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT NOT NULL,
  unidade_id TEXT,
  valor REAL NOT NULL DEFAULT 0,
  itens TEXT,
  criado_por TEXT,
  retirada_id TEXT,
  status TEXT DEFAULT 'pendente',
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  fechamento_id TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (retirada_id) REFERENCES caixa_retiradas(id) ON DELETE SET NULL,
  FOREIGN KEY (fechamento_id) REFERENCES fechamentos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vales_funcionarios (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT NOT NULL,
  unidade_id TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'produto_loja' CHECK (tipo IS NULL OR tipo IN ('produto_loja', 'adiantamento', 'bar')),
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IS NULL OR status IN ('aberto', 'quitado', 'cancelado')),
  autorizado_por TEXT,
  autorizado_em TEXT,
  observacao TEXT,
  aberto_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT,
  FOREIGN KEY (autorizado_por) REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vales_pix (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  colaborador_id TEXT,
  unidade_id TEXT,
  valor REAL NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'pendente',
  criado_por TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  descontado_em TEXT,
  fechamento_id TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (criado_por) REFERENCES colaboradores(id) ON DELETE SET NULL,
  FOREIGN KEY (fechamento_id) REFERENCES fechamentos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_conversas (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  cliente_id TEXT,
  numero TEXT NOT NULL,
  nome_contato TEXT,
  status TEXT DEFAULT 'aberta',
  atendente TEXT DEFAULT 'ia',
  unidade_id TEXT,
  ultima_msg_em TEXT,
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  estado_ia TEXT DEFAULT 'inicial',
  dados_ia TEXT DEFAULT '{}',
  agendamento_id TEXT,
  requer_humano INTEGER DEFAULT 0 CHECK (requer_humano IS NULL OR requer_humano IN (0,1)),
  requer_humano_em TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  conversa_id TEXT NOT NULL,
  evolution_msg_id TEXT,
  direcao TEXT NOT NULL,
  tipo TEXT DEFAULT 'texto',
  conteudo TEXT,
  midia_url TEXT,
  remetente TEXT DEFAULT 'cliente',
  lida INTEGER DEFAULT 0 CHECK (lida IS NULL OR lida IN (0,1)),
  criado_em TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (conversa_id) REFERENCES whatsapp_conversas(id) ON DELETE RESTRICT
);