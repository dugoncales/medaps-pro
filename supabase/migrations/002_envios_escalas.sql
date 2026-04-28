-- MedAPS Pro — Schema v2
-- Envio remoto de escalas (PROMs/PREMs) e armazenamento de PREMs aplicados

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- HELPER: empresa_id do usuário corrente (para RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM profissionais
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- PREMS APLICADOS
-- ============================================================
CREATE TABLE prems_aplicados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  consulta_id       UUID REFERENCES consultas(id) ON DELETE SET NULL,
  envio_id          UUID, -- preenchido se vier de envio remoto (FK abaixo)
  tipo              TEXT NOT NULL CHECK (tipo IN ('GLOBAL','AMPLIADO','PROTOCOLO')),
  protocolo_codigo  TEXT,
  respostas         JSONB NOT NULL,
  nps               INTEGER CHECK (nps IS NULL OR (nps BETWEEN 0 AND 10)),
  media_likert      NUMERIC(3,2),
  data_aplicacao    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prems_paciente ON prems_aplicados(paciente_id);
CREATE INDEX idx_prems_data     ON prems_aplicados(data_aplicacao DESC);
CREATE INDEX idx_prems_tipo     ON prems_aplicados(tipo);

ALTER TABLE prems_aplicados ENABLE ROW LEVEL SECURITY;

CREATE POLICY prem_select ON prems_aplicados FOR SELECT
  USING (paciente_id IN (
    SELECT id FROM pacientes WHERE empresa_id = get_user_empresa_id()
  ));
CREATE POLICY prem_insert ON prems_aplicados FOR INSERT
  WITH CHECK (paciente_id IN (
    SELECT id FROM pacientes WHERE empresa_id = get_user_empresa_id()
  ));
CREATE POLICY prem_update ON prems_aplicados FOR UPDATE
  USING (paciente_id IN (
    SELECT id FROM pacientes WHERE empresa_id = get_user_empresa_id()
  ));

-- ============================================================
-- ENVIOS DE ESCALAS
-- ============================================================
CREATE TABLE envios_escalas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id       UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  empresa_id        UUID NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
  escala_codigo     TEXT NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('prom','prem')),
  prem_codigo       TEXT CHECK (prem_codigo IS NULL OR prem_codigo IN ('GLOBAL','AMPLIADO','PROTOCOLO')),
  protocolo_codigo  TEXT,
  token             TEXT UNIQUE NOT NULL DEFAULT replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', ''),
  enviado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviado_por       UUID REFERENCES profissionais(id) ON DELETE SET NULL,
  canal             TEXT NOT NULL CHECK (canal IN ('whatsapp','email','link')),
  destino           TEXT,
  mensagem          TEXT,
  respondido_em     TIMESTAMPTZ,
  score             INTEGER,
  classificacao     TEXT,
  respostas         JSONB,
  status            TEXT NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente','enviado','aberto','respondido','expirado')),
  data_expiracao    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_envios_paciente ON envios_escalas(paciente_id);
CREATE INDEX idx_envios_token    ON envios_escalas(token);
CREATE INDEX idx_envios_status   ON envios_escalas(status);
CREATE INDEX idx_envios_empresa  ON envios_escalas(empresa_id);

ALTER TABLE envios_escalas ENABLE ROW LEVEL SECURITY;

-- Profissionais só veem envios da própria empresa
CREATE POLICY env_select ON envios_escalas FOR SELECT
  USING (empresa_id = get_user_empresa_id());
CREATE POLICY env_insert ON envios_escalas FOR INSERT
  WITH CHECK (empresa_id = get_user_empresa_id());
CREATE POLICY env_update ON envios_escalas FOR UPDATE
  USING (empresa_id = get_user_empresa_id());

-- FK tardia para prems → envios
ALTER TABLE prems_aplicados
  ADD CONSTRAINT prems_envio_fk
  FOREIGN KEY (envio_id) REFERENCES envios_escalas(id) ON DELETE SET NULL;

-- ============================================================
-- COLUNA prems EM consultas (referência rápida agregada)
-- ============================================================
ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS prems JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- RPC PÚBLICA — busca envio pelo token (sem auth, security definer)
-- ============================================================
CREATE OR REPLACE FUNCTION get_escala_by_token(p_token TEXT)
RETURNS TABLE (
  envio_id          UUID,
  paciente_nome     TEXT,
  paciente_id       UUID,
  escala_codigo     TEXT,
  tipo              TEXT,
  prem_codigo       TEXT,
  protocolo_codigo  TEXT,
  status            TEXT,
  expirado          BOOLEAN,
  protocolos_ativos TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    p.nome,
    p.id,
    e.escala_codigo,
    e.tipo,
    e.prem_codigo,
    e.protocolo_codigo,
    e.status,
    (e.data_expiracao < NOW())                              AS expirado,
    COALESCE(ARRAY(
      SELECT lc.protocolo_codigo
      FROM linhas_cuidado lc
      WHERE lc.paciente_id = p.id AND lc.status = 'ativo'
    ), ARRAY[]::TEXT[])                                     AS protocolos_ativos
  FROM envios_escalas e
  JOIN pacientes p ON p.id = e.paciente_id
  WHERE e.token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION get_escala_by_token(TEXT) TO anon, authenticated;

-- ============================================================
-- RPC PÚBLICA — registra resposta do envio (sem auth)
-- ============================================================
CREATE OR REPLACE FUNCTION submit_escala_resposta(
  p_token         TEXT,
  p_respostas     JSONB,
  p_score         INTEGER,
  p_classificacao TEXT
)
RETURNS TABLE (ok BOOLEAN, mensagem TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_envio envios_escalas%ROWTYPE;
BEGIN
  SELECT * INTO v_envio FROM envios_escalas WHERE token = p_token;

  IF v_envio.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Token inválido'::TEXT; RETURN;
  END IF;

  IF v_envio.status = 'respondido' THEN
    RETURN QUERY SELECT FALSE, 'Esta escala já foi respondida'::TEXT; RETURN;
  END IF;

  IF v_envio.data_expiracao < NOW() THEN
    UPDATE envios_escalas SET status = 'expirado' WHERE id = v_envio.id;
    RETURN QUERY SELECT FALSE, 'Link expirado'::TEXT; RETURN;
  END IF;

  UPDATE envios_escalas
     SET status         = 'respondido',
         respostas      = p_respostas,
         score          = p_score,
         classificacao  = p_classificacao,
         respondido_em  = NOW()
   WHERE id = v_envio.id;

  -- Se for PREM, espelha em prems_aplicados
  IF v_envio.tipo = 'prem' AND v_envio.prem_codigo IS NOT NULL THEN
    INSERT INTO prems_aplicados (
      paciente_id, envio_id, tipo, protocolo_codigo, respostas, nps, media_likert, data_aplicacao
    )
    VALUES (
      v_envio.paciente_id,
      v_envio.id,
      v_envio.prem_codigo,
      v_envio.protocolo_codigo,
      p_respostas,
      NULLIF((p_respostas->>'nps')::INTEGER, NULL),
      CASE
        WHEN p_score > 0 THEN ROUND((p_score / 100.0) * 5.0, 2)
        ELSE NULL
      END,
      NOW()
    );
  END IF;

  RETURN QUERY SELECT TRUE, 'Resposta registrada'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_escala_resposta(TEXT, JSONB, INTEGER, TEXT) TO anon, authenticated;

-- ============================================================
-- RPC PÚBLICA — marca envio como aberto (rastrear cliques)
-- ============================================================
CREATE OR REPLACE FUNCTION marcar_envio_aberto(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE envios_escalas
     SET status = 'aberto'
   WHERE token = p_token
     AND status = 'pendente';
END;
$$;

GRANT EXECUTE ON FUNCTION marcar_envio_aberto(TEXT) TO anon, authenticated;
