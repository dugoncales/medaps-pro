-- MedAPS Pro — Schema v1
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- EMPRESAS
-- ============================================================
CREATE TABLE empresas (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                 TEXT NOT NULL,
  cnpj                 TEXT NOT NULL UNIQUE,
  total_colaboradores  INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFISSIONAIS
-- ============================================================
CREATE TABLE profissionais (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  crm         TEXT,
  coren       TEXT,
  cargo       TEXT NOT NULL,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profissionais_user_id_key UNIQUE (user_id)
);

-- ============================================================
-- PACIENTES
-- ============================================================
CREATE TABLE pacientes (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  matricula               TEXT NOT NULL,
  nome                    TEXT NOT NULL,
  data_nascimento         DATE NOT NULL,
  sexo                    TEXT NOT NULL CHECK (sexo IN ('M','F','O')),
  setor                   TEXT,
  comorbidades            TEXT[] NOT NULL DEFAULT '{}',
  medicamentos_uso        TEXT,
  tabagismo_status        TEXT CHECK (tabagismo_status IN ('nunca','ex','atual')),
  tabagismo_macos_ano     NUMERIC(6,2),
  ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pacientes_empresa_matricula_key UNIQUE (empresa_id, matricula)
);

-- ============================================================
-- LINHAS DE CUIDADO
-- ============================================================
CREATE TABLE linhas_cuidado (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  protocolo_codigo  TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('ativo','inativo','alta')),
  nivel_gravidade   TEXT CHECK (nivel_gravidade IN ('controlado','parcial','descontrolado')),
  profissional_id   UUID REFERENCES profissionais(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT linhas_cuidado_paciente_protocolo_key UNIQUE (paciente_id, protocolo_codigo)
);

-- ============================================================
-- CONSULTAS
-- ============================================================
CREATE TABLE consultas (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id             UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id         UUID NOT NULL REFERENCES profissionais(id) ON DELETE RESTRICT,
  data_consulta           TIMESTAMPTZ NOT NULL,
  tipo                    TEXT NOT NULL CHECK (tipo IN ('consulta','retorno','triagem','urgencia')),
  protocolos_abordados    TEXT[] NOT NULL DEFAULT '{}',
  -- Sinais vitais e antropometria
  pa_sistolica            INTEGER,
  pa_diastolica           INTEGER,
  fc                      INTEGER,
  spo2                    NUMERIC(5,2),
  peso                    NUMERIC(6,2),
  altura                  NUMERIC(5,2),
  imc                     NUMERIC(5,2) GENERATED ALWAYS AS (
                            CASE WHEN altura IS NOT NULL AND altura > 0 AND peso IS NOT NULL
                                 THEN ROUND((peso / (altura * altura))::NUMERIC, 2)
                                 ELSE NULL END
                          ) STORED,
  circunferencia_abdominal  NUMERIC(5,2),
  glicemia_capilar          NUMERIC(6,2),
  -- SOAP
  subjetivo               TEXT,
  objetivo                TEXT,
  avaliacao               TEXT,
  plano                   TEXT,
  -- Dados estruturados
  escalas                 JSONB NOT NULL DEFAULT '{}',
  exames_solicitados      TEXT[] NOT NULL DEFAULT '{}',
  prescricoes             TEXT,
  retorno_em_dias         INTEGER,
  data_proximo_retorno    DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVOLUÇÕES CLÍNICAS
-- ============================================================
CREATE TABLE evolucoes_clinicas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  consulta_id       UUID REFERENCES consultas(id) ON DELETE SET NULL,
  protocolo_codigo  TEXT NOT NULL,
  metricas          JSONB NOT NULL DEFAULT '{}',
  passo_protocolo   INTEGER,
  status_controle   TEXT CHECK (status_controle IN ('controlado','parcial','descontrolado')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXAMES E RESULTADOS
-- ============================================================
CREATE TABLE exames_resultados (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nome_exame      TEXT NOT NULL,
  resultado       TEXT,
  valor_numerico  NUMERIC(12,4),
  data_coleta     DATE NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('pendente','coletado','resultado_disponivel','cancelado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ALERTAS
-- ============================================================
CREATE TABLE alertas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  protocolo_codigo  TEXT NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('retorno_vencido','exame_atrasado','meta_nao_atingida','urgencia')),
  prioridade        TEXT NOT NULL CHECK (prioridade IN ('baixa','media','alta','critica')),
  titulo            TEXT NOT NULL,
  descricao         TEXT,
  data_vencimento   DATE,
  dias_atraso       INTEGER NOT NULL DEFAULT 0,
  resolvido         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

-- ============================================================
-- AGENDAMENTOS
-- ============================================================
CREATE TABLE agendamentos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id       UUID REFERENCES profissionais(id) ON DELETE SET NULL,
  data_hora             TIMESTAMPTZ NOT NULL,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('consulta','retorno','triagem','exame')),
  protocolos_previstos  TEXT[] NOT NULL DEFAULT '{}',
  status                TEXT NOT NULL CHECK (status IN ('agendado','confirmado','realizado','cancelado','faltou')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDICADORES DA EMPRESA
-- ============================================================
CREATE TABLE indicadores_empresa (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id            UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  competencia           DATE NOT NULL,
  total_pacientes       INTEGER NOT NULL DEFAULT 0,
  has_controlados_pct   NUMERIC(5,2),
  dm_controlados_pct    NUMERIC(5,2),
  tab_cessacao_pct      NUMERIC(5,2),
  taxa_controle_geral   NUMERIC(5,2),
  roi_estimado          NUMERIC(14,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT indicadores_empresa_empresa_competencia_key UNIQUE (empresa_id, competencia)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profissionais_empresa ON profissionais(empresa_id);
CREATE INDEX idx_pacientes_empresa ON pacientes(empresa_id);
CREATE INDEX idx_linhas_cuidado_paciente ON linhas_cuidado(paciente_id);
CREATE INDEX idx_linhas_cuidado_protocolo ON linhas_cuidado(protocolo_codigo);
CREATE INDEX idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX idx_consultas_data ON consultas(data_consulta DESC);
CREATE INDEX idx_evolucoes_paciente ON evolucoes_clinicas(paciente_id);
CREATE INDEX idx_evolucoes_protocolo ON evolucoes_clinicas(protocolo_codigo);
CREATE INDEX idx_exames_paciente ON exames_resultados(paciente_id);
CREATE INDEX idx_alertas_empresa ON alertas(empresa_id);
CREATE INDEX idx_alertas_paciente ON alertas(paciente_id);
CREATE INDEX idx_alertas_resolvido ON alertas(resolvido) WHERE resolvido = FALSE;
CREATE INDEX idx_agendamentos_paciente ON agendamentos(paciente_id);
CREATE INDEX idx_agendamentos_data ON agendamentos(data_hora);
CREATE INDEX idx_indicadores_empresa_competencia ON indicadores_empresa(empresa_id, competencia);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE empresas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE linhas_cuidado       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolucoes_clinicas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exames_resultados    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores_empresa  ENABLE ROW LEVEL SECURITY;

-- Profissionais só veem dados da própria empresa
CREATE POLICY profissional_empresa ON profissionais
  USING (empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY paciente_empresa ON pacientes
  USING (empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY linha_cuidado_empresa ON linhas_cuidado
  USING (paciente_id IN (
    SELECT id FROM pacientes
    WHERE empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1)
  ));

CREATE POLICY consulta_empresa ON consultas
  USING (paciente_id IN (
    SELECT id FROM pacientes
    WHERE empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1)
  ));

CREATE POLICY evolucao_empresa ON evolucoes_clinicas
  USING (paciente_id IN (
    SELECT id FROM pacientes
    WHERE empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1)
  ));

CREATE POLICY exame_empresa ON exames_resultados
  USING (paciente_id IN (
    SELECT id FROM pacientes
    WHERE empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1)
  ));

CREATE POLICY alerta_empresa ON alertas
  USING (empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY agendamento_empresa ON agendamentos
  USING (paciente_id IN (
    SELECT id FROM pacientes
    WHERE empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1)
  ));

CREATE POLICY indicador_empresa ON indicadores_empresa
  USING (empresa_id = (SELECT empresa_id FROM profissionais WHERE user_id = auth.uid() LIMIT 1));
