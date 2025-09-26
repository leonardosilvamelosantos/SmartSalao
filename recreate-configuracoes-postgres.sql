-- Remover tabela configuracoes existente e recriar com estrutura correta
DROP TABLE IF EXISTS configuracoes;

-- Criar tabela configuracoes com estrutura correta
CREATE TABLE configuracoes (
  id_configuracao SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL,
  nome_estabelecimento TEXT DEFAULT '',
  cnpj TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  email_contato TEXT DEFAULT '',
  horario_abertura TEXT DEFAULT '08:00',
  horario_fechamento TEXT DEFAULT '18:00',
  dias_funcionamento TEXT DEFAULT '["segunda", "terca", "quarta", "quinta", "sexta"]',
  intervalo_agendamento INTEGER DEFAULT 30,
  notificar_agendamentos INTEGER DEFAULT 1,
  notificar_cancelamentos INTEGER DEFAULT 1,
  lembrete_cliente INTEGER DEFAULT 1,
  horas_lembrete INTEGER DEFAULT 24,
  metodo_pagamento_padrao TEXT DEFAULT 'dinheiro',
  aceitar_pix INTEGER DEFAULT 0,
  auto_confirm_whatsapp INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_usuario ON configuracoes(id_usuario);

