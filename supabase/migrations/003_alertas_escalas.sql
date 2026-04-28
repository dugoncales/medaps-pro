-- MedAPS Pro — Schema v3
-- Alertas automáticos a partir de scores críticos de PROMs/PREMs

-- ============================================================
-- Expandir tipos de alerta para escalas
-- ============================================================
ALTER TABLE alertas DROP CONSTRAINT IF EXISTS alertas_tipo_check;
ALTER TABLE alertas ADD CONSTRAINT alertas_tipo_check
  CHECK (tipo IN (
    'retorno_vencido',
    'exame_atrasado',
    'meta_nao_atingida',
    'urgencia',
    'phq9_critico',
    'risco_suicidio',
    'gad7_critico',
    'cat_critico',
    'audit_critico',
    'paciente_detrator'
  ));

-- ============================================================
-- Coluna metadata em alertas (escala_codigo, score, envio_id…)
-- ============================================================
ALTER TABLE alertas
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_alertas_metadata_origem
  ON alertas ((metadata->>'origem'));

-- ============================================================
-- RPC submit_escala_resposta — agora também insere alerta
-- ============================================================
DROP FUNCTION IF EXISTS submit_escala_resposta(TEXT, JSONB, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION submit_escala_resposta(
  p_token         TEXT,
  p_respostas     JSONB,
  p_score         INTEGER,
  p_classificacao TEXT,
  p_alerta        JSONB DEFAULT NULL
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

  -- Espelha PREM em prems_aplicados
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

  -- Cria alerta automático se cliente avaliou criticidade
  IF p_alerta IS NOT NULL AND (p_alerta ? 'tipo') THEN
    INSERT INTO alertas (
      paciente_id,
      empresa_id,
      protocolo_codigo,
      tipo,
      prioridade,
      titulo,
      descricao,
      dias_atraso,
      metadata
    )
    VALUES (
      v_envio.paciente_id,
      v_envio.empresa_id,
      COALESCE(v_envio.protocolo_codigo, p_alerta->>'protocolo_codigo', 'GERAL'),
      p_alerta->>'tipo',
      p_alerta->>'prioridade',
      p_alerta->>'titulo',
      p_alerta->>'descricao',
      0,
      jsonb_build_object(
        'origem',         'remoto',
        'escala_codigo',  v_envio.escala_codigo,
        'score',          p_score,
        'classificacao',  p_classificacao,
        'envio_id',       v_envio.id,
        'data_aplicacao', NOW()
      )
    );
  END IF;

  RETURN QUERY SELECT TRUE, 'Resposta registrada'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_escala_resposta(TEXT, JSONB, INTEGER, TEXT, JSONB)
  TO anon, authenticated;
