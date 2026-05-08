-- MedAPS Pro — Schema v5
-- RLS para agendamentos. A policy criada em 001 só tinha USING (sem
-- WITH CHECK), o que bloqueia INSERTs quando o cliente faz select
-- pós-insert. Substituímos por uma policy completa.

-- Garantir RLS ativo e policies corretas para agendamentos
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa_own_agendamentos" ON agendamentos;
CREATE POLICY "empresa_own_agendamentos" ON agendamentos
  USING (
    paciente_id IN (
      SELECT id FROM pacientes WHERE empresa_id = get_user_empresa_id()
    )
  )
  WITH CHECK (
    paciente_id IN (
      SELECT id FROM pacientes WHERE empresa_id = get_user_empresa_id()
    )
  );
