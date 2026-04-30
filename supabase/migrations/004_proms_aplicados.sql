-- MedAPS Pro — Schema v4
-- Tabela de PROMs aplicados (presencial e remoto), espelho de prems_aplicados.

CREATE TABLE IF NOT EXISTS proms_aplicados (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES profissionais(id),
  consulta_id     UUID REFERENCES consultas(id),
  envio_id        UUID REFERENCES envios_escalas(id),
  codigo          TEXT NOT NULL,
  respostas       JSONB NOT NULL DEFAULT '{}'::jsonb,
  score           NUMERIC,
  classificacao   TEXT,
  data_aplicacao  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  origem          TEXT NOT NULL DEFAULT 'presencial'
                    CHECK (origem IN ('presencial','remoto')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE proms_aplicados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_own" ON proms_aplicados
  USING      (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

CREATE INDEX IF NOT EXISTS idx_proms_paciente ON proms_aplicados(paciente_id);
CREATE INDEX IF NOT EXISTS idx_proms_empresa  ON proms_aplicados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proms_data     ON proms_aplicados(data_aplicacao DESC);
CREATE INDEX IF NOT EXISTS idx_proms_codigo   ON proms_aplicados(codigo);
