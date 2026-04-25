import type {
  Empresa,
  Profissional,
  Paciente,
  LinhaCuidado,
  Consulta,
  EvolucaoClinica,
  ExameResultado,
  Alerta,
  Agendamento,
  IndicadoresEmpresa,
} from '@/types'

export const IS_DEMO_MODE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') === 'placeholder_url' ||
  !(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')

// ── IDs fixos para relacionamentos ──────────────────────────
const EMP_ID = 'empresa-001'
const PROF_ID = 'prof-001'

const P1 = 'pac-joao-silva'
const P2 = 'pac-maria-santos'
const P3 = 'pac-pedro-oliveira'
const P4 = 'pac-ana-costa'
const P5 = 'pac-carlos-ferreira'
const P6 = 'pac-lucia-almeida'
const P7 = 'pac-roberto-moraes'
const P8 = 'pac-paula-lima'

// ── Empresa ──────────────────────────────────────────────────
export const demoEmpresa: Empresa = {
  id: EMP_ID,
  nome: 'Metalúrgica São Paulo LTDA',
  cnpj: '12.345.678/0001-90',
  total_colaboradores: 500,
  created_at: '2025-01-10T08:00:00Z',
}

// ── Profissional ─────────────────────────────────────────────
export const demoProfissional: Profissional = {
  id: PROF_ID,
  user_id: 'user-demo',
  nome: 'Dra. Fernanda Rocha',
  crm: 'CRM-SP 123456',
  cargo: 'Médica do Trabalho',
  empresa_id: EMP_ID,
  ativo: true,
  created_at: '2025-01-10T08:00:00Z',
}

// ── Pacientes ─────────────────────────────────────────────────
export const demoPacientes: Paciente[] = [
  {
    id: P1,
    empresa_id: EMP_ID,
    matricula: 'MSP-001',
    nome: 'João Silva',
    data_nascimento: '1972-03-15',
    sexo: 'M',
    setor: 'Manutenção',
    comorbidades: ['HAS', 'DM'],
    medicamentos_uso: 'Losartana 50mg, Metformina 850mg',
    tabagismo_status: 'ex',
    tabagismo_macos_ano: 20,
    ativo: true,
    created_at: '2025-02-01T08:00:00Z',
  },
  {
    id: P2,
    empresa_id: EMP_ID,
    matricula: 'MSP-002',
    nome: 'Maria Santos',
    data_nascimento: '1979-07-22',
    sexo: 'F',
    setor: 'Administrativo',
    comorbidades: ['OBE', 'DIS'],
    medicamentos_uso: 'Rosuvastatina 20mg',
    tabagismo_status: 'nunca',
    ativo: true,
    created_at: '2025-02-05T08:00:00Z',
  },
  {
    id: P3,
    empresa_id: EMP_ID,
    matricula: 'MSP-003',
    nome: 'Pedro Oliveira',
    data_nascimento: '1986-11-08',
    sexo: 'M',
    setor: 'Produção',
    comorbidades: ['TAB', 'DPC'],
    medicamentos_uso: 'Budesonida/Formoterol 400/12mcg',
    tabagismo_status: 'atual',
    tabagismo_macos_ano: 18,
    ativo: true,
    created_at: '2025-02-10T08:00:00Z',
  },
  {
    id: P4,
    empresa_id: EMP_ID,
    matricula: 'MSP-004',
    nome: 'Ana Costa',
    data_nascimento: '1991-05-30',
    sexo: 'F',
    setor: 'TI',
    comorbidades: ['SM', 'TAG'],
    medicamentos_uso: 'Sertralina 50mg, Escitalopram 10mg',
    tabagismo_status: 'nunca',
    ativo: true,
    created_at: '2025-02-12T08:00:00Z',
  },
  {
    id: P5,
    empresa_id: EMP_ID,
    matricula: 'MSP-005',
    nome: 'Carlos Ferreira',
    data_nascimento: '1976-09-14',
    sexo: 'M',
    setor: 'Logística',
    comorbidades: ['CHK'],
    medicamentos_uso: '',
    tabagismo_status: 'nunca',
    ativo: true,
    created_at: '2025-02-15T08:00:00Z',
  },
  {
    id: P6,
    empresa_id: EMP_ID,
    matricula: 'MSP-006',
    nome: 'Lucia Almeida',
    data_nascimento: '1963-01-20',
    sexo: 'F',
    setor: 'RH',
    comorbidades: ['HAS', 'HIP'],
    medicamentos_uso: 'Anlodipino 10mg, Levotiroxina 75mcg',
    tabagismo_status: 'ex',
    tabagismo_macos_ano: 10,
    ativo: true,
    created_at: '2025-02-18T08:00:00Z',
  },
  {
    id: P7,
    empresa_id: EMP_ID,
    matricula: 'MSP-007',
    nome: 'Roberto Moraes',
    data_nascimento: '1969-04-03',
    sexo: 'M',
    setor: 'Engenharia',
    comorbidades: ['DM', 'SAO'],
    medicamentos_uso: 'Metformina 1g, Sitagliptina 100mg, CPAP AutoPress',
    tabagismo_status: 'nunca',
    ativo: true,
    created_at: '2025-02-20T08:00:00Z',
  },
  {
    id: P8,
    empresa_id: EMP_ID,
    matricula: 'MSP-008',
    nome: 'Paula Lima',
    data_nascimento: '1997-12-05',
    sexo: 'F',
    setor: 'Segurança do Trabalho',
    comorbidades: ['MUL', 'DRM'],
    medicamentos_uso: 'Hidrocortisona creme 1%, Emoliente tópico',
    tabagismo_status: 'nunca',
    ativo: true,
    created_at: '2025-03-01T08:00:00Z',
  },
]

// ── Linhas de Cuidado ─────────────────────────────────────────
export const demoLinhas: LinhaCuidado[] = [
  { id: 'lc-01', paciente_id: P1, protocolo_codigo: 'HAS', status: 'ativo', nivel_gravidade: 'parcial', profissional_id: PROF_ID, created_at: '2025-02-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'lc-02', paciente_id: P1, protocolo_codigo: 'DM', status: 'ativo', nivel_gravidade: 'parcial', profissional_id: PROF_ID, created_at: '2025-02-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
  { id: 'lc-03', paciente_id: P2, protocolo_codigo: 'OBE', status: 'ativo', nivel_gravidade: 'parcial', profissional_id: PROF_ID, created_at: '2025-02-05T08:00:00Z', updated_at: '2026-03-15T08:00:00Z' },
  { id: 'lc-04', paciente_id: P2, protocolo_codigo: 'DIS', status: 'ativo', nivel_gravidade: 'descontrolado', profissional_id: PROF_ID, created_at: '2025-02-05T08:00:00Z', updated_at: '2026-03-15T08:00:00Z' },
  { id: 'lc-05', paciente_id: P3, protocolo_codigo: 'TAB', status: 'ativo', nivel_gravidade: 'descontrolado', profissional_id: PROF_ID, created_at: '2025-02-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
  { id: 'lc-06', paciente_id: P3, protocolo_codigo: 'DPC', status: 'ativo', nivel_gravidade: 'parcial', profissional_id: PROF_ID, created_at: '2025-02-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
  { id: 'lc-07', paciente_id: P4, protocolo_codigo: 'SM', status: 'ativo', nivel_gravidade: 'descontrolado', profissional_id: PROF_ID, created_at: '2025-02-12T08:00:00Z', updated_at: '2026-04-05T08:00:00Z' },
  { id: 'lc-08', paciente_id: P4, protocolo_codigo: 'TAG', status: 'ativo', nivel_gravidade: 'descontrolado', profissional_id: PROF_ID, created_at: '2025-02-12T08:00:00Z', updated_at: '2026-04-05T08:00:00Z' },
  { id: 'lc-09', paciente_id: P5, protocolo_codigo: 'CHK', status: 'ativo', nivel_gravidade: 'controlado', profissional_id: PROF_ID, created_at: '2025-02-15T08:00:00Z', updated_at: '2026-03-20T08:00:00Z' },
  { id: 'lc-10', paciente_id: P6, protocolo_codigo: 'HAS', status: 'ativo', nivel_gravidade: 'descontrolado', profissional_id: PROF_ID, created_at: '2025-02-18T08:00:00Z', updated_at: '2026-03-10T08:00:00Z' },
  { id: 'lc-11', paciente_id: P6, protocolo_codigo: 'HIP', status: 'ativo', nivel_gravidade: 'parcial', profissional_id: PROF_ID, created_at: '2025-02-18T08:00:00Z', updated_at: '2026-03-10T08:00:00Z' },
  { id: 'lc-12', paciente_id: P7, protocolo_codigo: 'DM', status: 'ativo', nivel_gravidade: 'parcial', profissional_id: PROF_ID, created_at: '2025-02-20T08:00:00Z', updated_at: '2026-04-02T08:00:00Z' },
  { id: 'lc-13', paciente_id: P7, protocolo_codigo: 'SAO', status: 'ativo', nivel_gravidade: 'parcial', profissional_id: PROF_ID, created_at: '2025-02-20T08:00:00Z', updated_at: '2026-04-02T08:00:00Z' },
  { id: 'lc-14', paciente_id: P8, protocolo_codigo: 'MUL', status: 'ativo', nivel_gravidade: 'controlado', profissional_id: PROF_ID, created_at: '2025-03-01T08:00:00Z', updated_at: '2026-04-15T08:00:00Z' },
  { id: 'lc-15', paciente_id: P8, protocolo_codigo: 'DRM', status: 'ativo', nivel_gravidade: 'parcial', profissional_id: PROF_ID, created_at: '2025-03-01T08:00:00Z', updated_at: '2026-04-15T08:00:00Z' },
]

// ── Consultas históricas ──────────────────────────────────────
export const demoConsultas: Consulta[] = [
  {
    id: 'con-001',
    paciente_id: P1,
    profissional_id: PROF_ID,
    data_consulta: '2026-01-15T09:00:00Z',
    tipo: 'retorno',
    protocolos_abordados: ['HAS', 'DM'],
    pa_sistolica: 148,
    pa_diastolica: 92,
    fc: 78,
    spo2: 98,
    peso: 88,
    altura: 1.74,
    imc: 29.1,
    circunferencia_abdominal: 100,
    glicemia_capilar: 145,
    subjetivo: 'Paciente refere episódios de cefaleia occipital. Nega tonturas. HGT em casa 140-170.',
    objetivo: 'PA 148/92 mmHg. IMC 29. CA 100cm. Fundoscopia prévia: retinopatia leve grau 1.',
    avaliacao: 'HAS grau 2 sem controle. DM parcialmente controlado (HbA1c 7.8% em dez/25).',
    plano: 'Aumento Losartana 100mg. Referência nutricional. Retorno 45 dias.',
    escalas: {},
    exames_solicitados: ['HbA1c', 'Creatinina', 'Microalbuminúria', 'Lipidograma'],
    prescricoes: 'Losartana 100mg 1cp/dia. Metformina 850mg 2x/dia.',
    retorno_em_dias: 45,
    data_proximo_retorno: '2026-03-01',
    created_at: '2026-01-15T09:30:00Z',
  },
  {
    id: 'con-002',
    paciente_id: P4,
    profissional_id: PROF_ID,
    data_consulta: '2026-02-10T10:30:00Z',
    tipo: 'consulta',
    protocolos_abordados: ['SM', 'TAG'],
    pa_sistolica: 118,
    pa_diastolica: 74,
    fc: 92,
    spo2: 99,
    peso: 62,
    altura: 1.65,
    imc: 22.8,
    subjetivo: 'Choro fácil, dificuldade para dormir, preocupação excessiva com trabalho. PHQ-9: 16. GAD-7: 14.',
    objetivo: 'Paciente com fácies ansiosa, trêmula. Sem ideação suicida.',
    avaliacao: 'Depressão moderada-grave (PHQ-9=16). TAG moderado (GAD-7=14).',
    plano: 'Sertralina 50mg titulando para 100mg. TCC semanal. Retorno 14 dias.',
    escalas: { phq9: 16, gad7: 14 },
    exames_solicitados: ['TSH', 'Hemograma', 'TSH'],
    prescricoes: 'Sertralina 50mg 1cp/dia manhã. Clonazepam 0,5mg se necessário (máx 15 dias).',
    retorno_em_dias: 14,
    data_proximo_retorno: '2026-02-24',
    created_at: '2026-02-10T11:00:00Z',
  },
  {
    id: 'con-003',
    paciente_id: P6,
    profissional_id: PROF_ID,
    data_consulta: '2026-03-08T14:00:00Z',
    tipo: 'retorno',
    protocolos_abordados: ['HAS'],
    pa_sistolica: 165,
    pa_diastolica: 102,
    fc: 80,
    spo2: 97,
    peso: 76,
    altura: 1.62,
    imc: 28.9,
    circunferencia_abdominal: 92,
    subjetivo: 'Refere esquecimento das medicações. Dor de cabeça frequente.',
    objetivo: 'PA 165/102 mmHg bilateral. Edema de MMII 1+.',
    avaliacao: 'HAS grau 3 descontrolada. Suspeita de baixa adesão medicamentosa.',
    plano: 'Anlodipino 10mg + Hidroclorotiazida 25mg. Reforço adesão. Retorno 30 dias.',
    escalas: {},
    exames_solicitados: ['ECG', 'Creatinina', 'K+', 'Microalbuminúria'],
    prescricoes: 'Anlodipino 10mg + HCTZ 25mg 1cp pela manhã.',
    retorno_em_dias: 30,
    data_proximo_retorno: '2026-04-08',
    created_at: '2026-03-08T14:30:00Z',
  },
  {
    id: 'con-004',
    paciente_id: P7,
    profissional_id: PROF_ID,
    data_consulta: '2026-04-01T11:00:00Z',
    tipo: 'retorno',
    protocolos_abordados: ['DM', 'SAO'],
    pa_sistolica: 132,
    pa_diastolica: 84,
    fc: 76,
    spo2: 96,
    peso: 102,
    altura: 1.78,
    imc: 32.2,
    circunferencia_abdominal: 108,
    glicemia_capilar: 138,
    subjetivo: 'Sonolência diurna persistente. Usa CPAP 3,5h/noite em média. HGT variando 110-160.',
    objetivo: 'IAH residual CPAP: 4,2. Adesão CPAP 52% noites. HbA1c jan/26: 7.5%.',
    avaliacao: 'DM parcialmente controlado. SAO com adesão CPAP insuficiente (<70%).',
    plano: 'Ajuste máscara CPAP (nasal→full face). Sitagliptina 100mg. Retorno 90 dias.',
    escalas: { epworth: 14 },
    exames_solicitados: ['HbA1c', 'TFG'],
    prescricoes: 'Metformina 1g 2x/dia. Sitagliptina 100mg 1cp/dia.',
    retorno_em_dias: 90,
    data_proximo_retorno: '2026-07-01',
    created_at: '2026-04-01T11:30:00Z',
  },
  {
    id: 'con-005',
    paciente_id: P5,
    profissional_id: PROF_ID,
    data_consulta: '2026-03-20T09:30:00Z',
    tipo: 'triagem',
    protocolos_abordados: ['CHK'],
    pa_sistolica: 122,
    pa_diastolica: 76,
    fc: 68,
    spo2: 99,
    peso: 79,
    altura: 1.80,
    imc: 24.4,
    subjetivo: 'Paciente assintomático. Solicita check-up anual.',
    objetivo: 'PA normal. IMC adequado. Exames laboratoriais: glicemia 88, LDL 95, CT 168.',
    avaliacao: 'Check-up preventivo. Rastreamentos em dia. Risco CV baixo.',
    plano: 'DNA-HPV? Não aplicável (sexo M). FIT solicitado. Vacinação influenza agendada. Retorno 1 ano.',
    escalas: { phq2: 0, audit_c: 0 },
    exames_solicitados: ['FIT', 'PSA (decisão compartilhada)', 'Glicemia', 'Lipidograma'],
    retorno_em_dias: 365,
    data_proximo_retorno: '2027-03-20',
    created_at: '2026-03-20T10:00:00Z',
  },
]

// ── Evoluções Clínicas ────────────────────────────────────────
export const demoEvolucoes: EvolucaoClinica[] = [
  { id: 'ev-01', paciente_id: P1, consulta_id: 'con-001', protocolo_codigo: 'HAS', metricas: { pa_sistolica: 148, pa_diastolica: 92 }, passo_protocolo: 3, status_controle: 'parcial', created_at: '2026-01-15T09:30:00Z' },
  { id: 'ev-02', paciente_id: P1, consulta_id: 'con-001', protocolo_codigo: 'DM', metricas: { hba1c: 7.8 }, passo_protocolo: 3, status_controle: 'parcial', created_at: '2026-01-15T09:30:00Z' },
  { id: 'ev-03', paciente_id: P4, consulta_id: 'con-002', protocolo_codigo: 'SM', metricas: { phq9: 16 }, passo_protocolo: 3, status_controle: 'descontrolado', created_at: '2026-02-10T11:00:00Z' },
  { id: 'ev-04', paciente_id: P4, consulta_id: 'con-002', protocolo_codigo: 'TAG', metricas: { gad7: 14 }, passo_protocolo: 3, status_controle: 'descontrolado', created_at: '2026-02-10T11:00:00Z' },
  { id: 'ev-05', paciente_id: P6, consulta_id: 'con-003', protocolo_codigo: 'HAS', metricas: { pa_sistolica: 165, pa_diastolica: 102 }, passo_protocolo: 3, status_controle: 'descontrolado', created_at: '2026-03-08T14:30:00Z' },
]

// ── Exames ────────────────────────────────────────────────────
export const demoExames: ExameResultado[] = [
  { id: 'ex-01', paciente_id: P1, nome_exame: 'HbA1c', resultado: '7.8%', valor_numerico: 7.8, data_coleta: '2025-12-20', status: 'resultado_disponivel', created_at: '2025-12-20T00:00:00Z' },
  { id: 'ex-02', paciente_id: P1, nome_exame: 'Creatinina', resultado: '1.1 mg/dL', valor_numerico: 1.1, data_coleta: '2025-12-20', status: 'resultado_disponivel', created_at: '2025-12-20T00:00:00Z' },
  { id: 'ex-03', paciente_id: P1, nome_exame: 'Microalbuminúria', resultado: '42 mg/g', valor_numerico: 42, data_coleta: '2025-12-20', status: 'resultado_disponivel', created_at: '2025-12-20T00:00:00Z' },
  { id: 'ex-04', paciente_id: P2, nome_exame: 'Lipidograma', resultado: 'LDL 145 mg/dL', valor_numerico: 145, data_coleta: '2025-10-15', status: 'resultado_disponivel', created_at: '2025-10-15T00:00:00Z' },
  { id: 'ex-05', paciente_id: P7, nome_exame: 'HbA1c', resultado: '7.5%', valor_numerico: 7.5, data_coleta: '2026-01-10', status: 'resultado_disponivel', created_at: '2026-01-10T00:00:00Z' },
  { id: 'ex-06', paciente_id: P7, nome_exame: 'Polissonografia', resultado: 'IAH 24 eventos/h — SAOS moderada', valor_numerico: 24, data_coleta: '2025-11-05', status: 'resultado_disponivel', created_at: '2025-11-05T00:00:00Z' },
  { id: 'ex-07', paciente_id: P3, nome_exame: 'Espirometria', resultado: 'VEF1/CVF 0.62 — DPOC GOLD 2', valor_numerico: 0.62, data_coleta: '2025-09-20', status: 'resultado_disponivel', created_at: '2025-09-20T00:00:00Z' },
  { id: 'ex-08', paciente_id: P6, nome_exame: 'TSH', resultado: '3.8 mUI/L', valor_numerico: 3.8, data_coleta: '2025-12-10', status: 'resultado_disponivel', created_at: '2025-12-10T00:00:00Z' },
  { id: 'ex-09', paciente_id: P8, nome_exame: 'DNA-HPV', resultado: 'Negativo', data_coleta: '2025-06-15', status: 'resultado_disponivel', created_at: '2025-06-15T00:00:00Z' },
  { id: 'ex-10', paciente_id: P5, nome_exame: 'FIT', resultado: 'Negativo', data_coleta: '2026-03-20', status: 'resultado_disponivel', created_at: '2026-03-20T00:00:00Z' },
]

// ── Alertas ───────────────────────────────────────────────────
export const demoAlertas: Alerta[] = [
  {
    id: 'al-01',
    paciente_id: P1,
    empresa_id: EMP_ID,
    protocolo_codigo: 'HAS',
    tipo: 'retorno_vencido',
    prioridade: 'critica',
    titulo: 'HAS — retorno atrasado 52d',
    descricao: 'Retorno previsto para 01/03/2026. João Silva com 52 dias de atraso.',
    data_vencimento: '2026-03-01',
    dias_atraso: 52,
    resolvido: false,
    created_at: '2026-03-02T08:00:00Z',
    paciente: { nome: 'João Silva', matricula: 'MSP-001' },
  },
  {
    id: 'al-02',
    paciente_id: P1,
    empresa_id: EMP_ID,
    protocolo_codigo: 'DM',
    tipo: 'exame_atrasado',
    prioridade: 'alta',
    titulo: 'HbA1c atrasado 60d',
    descricao: 'Último HbA1c em dez/25. Previsto a cada 90 dias.',
    data_vencimento: '2026-03-20',
    dias_atraso: 33,
    resolvido: false,
    created_at: '2026-03-21T08:00:00Z',
    paciente: { nome: 'João Silva', matricula: 'MSP-001' },
  },
  {
    id: 'al-03',
    paciente_id: P4,
    empresa_id: EMP_ID,
    protocolo_codigo: 'SM',
    tipo: 'retorno_vencido',
    prioridade: 'critica',
    titulo: 'Saúde Mental — retorno atrasado 45d',
    descricao: 'Retorno previsto para 24/02/2026. Ana Costa com 57 dias de atraso.',
    data_vencimento: '2026-02-24',
    dias_atraso: 57,
    resolvido: false,
    created_at: '2026-02-25T08:00:00Z',
    paciente: { nome: 'Ana Costa', matricula: 'MSP-004' },
  },
  {
    id: 'al-04',
    paciente_id: P6,
    empresa_id: EMP_ID,
    protocolo_codigo: 'HAS',
    tipo: 'retorno_vencido',
    prioridade: 'alta',
    titulo: 'HAS — retorno atrasado 14d',
    descricao: 'Retorno previsto para 08/04/2026. Lucia Almeida com 14 dias de atraso.',
    data_vencimento: '2026-04-08',
    dias_atraso: 14,
    resolvido: false,
    created_at: '2026-04-09T08:00:00Z',
    paciente: { nome: 'Lucia Almeida', matricula: 'MSP-006' },
  },
  {
    id: 'al-05',
    paciente_id: P4,
    empresa_id: EMP_ID,
    protocolo_codigo: 'TAG',
    tipo: 'retorno_vencido',
    prioridade: 'media',
    titulo: 'TAG — retorno atrasado 20d',
    descricao: 'Retorno previsto para 03/04/2026. Ana Costa com 19 dias de atraso.',
    data_vencimento: '2026-04-03',
    dias_atraso: 19,
    resolvido: false,
    created_at: '2026-04-04T08:00:00Z',
    paciente: { nome: 'Ana Costa', matricula: 'MSP-004' },
  },
  {
    id: 'al-06',
    paciente_id: P7,
    empresa_id: EMP_ID,
    protocolo_codigo: 'SAO',
    tipo: 'exame_atrasado',
    prioridade: 'media',
    titulo: 'Cartão CPAP atrasado 15d',
    descricao: 'Leitura de cartão CPAP vencida. Roberto Moraes.',
    data_vencimento: '2026-04-07',
    dias_atraso: 15,
    resolvido: false,
    created_at: '2026-04-08T08:00:00Z',
    paciente: { nome: 'Roberto Moraes', matricula: 'MSP-007' },
  },
  {
    id: 'al-07',
    paciente_id: P3,
    empresa_id: EMP_ID,
    protocolo_codigo: 'DPC',
    tipo: 'exame_atrasado',
    prioridade: 'media',
    titulo: 'Espirometria atrasada 10d',
    descricao: 'Espirometria anual vencida há 10 dias. Pedro Oliveira.',
    data_vencimento: '2026-04-12',
    dias_atraso: 10,
    resolvido: false,
    created_at: '2026-04-13T08:00:00Z',
    paciente: { nome: 'Pedro Oliveira', matricula: 'MSP-003' },
  },
  {
    id: 'al-08',
    paciente_id: P2,
    empresa_id: EMP_ID,
    protocolo_codigo: 'DIS',
    tipo: 'exame_atrasado',
    prioridade: 'baixa',
    titulo: 'Lipidograma — verificar resultado',
    descricao: 'Último lipidograma em out/25 (LDL 145). Repetir em abr/26.',
    data_vencimento: '2026-04-15',
    dias_atraso: 7,
    resolvido: false,
    created_at: '2026-04-16T08:00:00Z',
    paciente: { nome: 'Maria Santos', matricula: 'MSP-002' },
  },
  {
    id: 'al-09',
    paciente_id: P8,
    empresa_id: EMP_ID,
    protocolo_codigo: 'DRM',
    tipo: 'meta_nao_atingida',
    prioridade: 'baixa',
    titulo: 'DRM — notificação SINAN pendente',
    descricao: 'Dermatose ocupacional sem registro no SINAN. Paula Lima.',
    data_vencimento: '2026-04-22',
    dias_atraso: 0,
    resolvido: false,
    created_at: '2026-04-22T08:00:00Z',
    paciente: { nome: 'Paula Lima', matricula: 'MSP-008' },
  },
  {
    id: 'al-10',
    paciente_id: P5,
    empresa_id: EMP_ID,
    protocolo_codigo: 'CHK',
    tipo: 'meta_nao_atingida',
    prioridade: 'baixa',
    titulo: 'CHK — vacina Influenza pendente',
    descricao: 'Influenza 2026 ainda não registrada. Carlos Ferreira.',
    data_vencimento: '2026-04-30',
    dias_atraso: 0,
    resolvido: false,
    created_at: '2026-04-22T08:00:00Z',
    paciente: { nome: 'Carlos Ferreira', matricula: 'MSP-005' },
  },
]

// ── Agendamentos (agenda do dia: 2026-04-22) ──────────────────
export const demoAgendamentos: Agendamento[] = [
  {
    id: 'ag-01',
    paciente_id: P1,
    profissional_id: PROF_ID,
    data_hora: '2026-04-22T08:00:00Z',
    tipo: 'retorno',
    protocolos_previstos: ['HAS', 'DM'],
    status: 'confirmado',
    created_at: '2026-04-15T08:00:00Z',
    paciente: { nome: 'João Silva', matricula: 'MSP-001', setor: 'Manutenção' },
  },
  {
    id: 'ag-02',
    paciente_id: P4,
    profissional_id: PROF_ID,
    data_hora: '2026-04-22T09:00:00Z',
    tipo: 'retorno',
    protocolos_previstos: ['SM', 'TAG'],
    status: 'confirmado',
    created_at: '2026-04-15T08:00:00Z',
    paciente: { nome: 'Ana Costa', matricula: 'MSP-004', setor: 'TI' },
  },
  {
    id: 'ag-03',
    paciente_id: P6,
    profissional_id: PROF_ID,
    data_hora: '2026-04-22T10:00:00Z',
    tipo: 'retorno',
    protocolos_previstos: ['HAS'],
    status: 'agendado',
    created_at: '2026-04-15T08:00:00Z',
    paciente: { nome: 'Lucia Almeida', matricula: 'MSP-006', setor: 'RH' },
  },
  {
    id: 'ag-04',
    paciente_id: P3,
    profissional_id: PROF_ID,
    data_hora: '2026-04-22T11:00:00Z',
    tipo: 'consulta',
    protocolos_previstos: ['TAB', 'DPC'],
    status: 'agendado',
    created_at: '2026-04-15T08:00:00Z',
    paciente: { nome: 'Pedro Oliveira', matricula: 'MSP-003', setor: 'Produção' },
  },
  {
    id: 'ag-05',
    paciente_id: P8,
    profissional_id: PROF_ID,
    data_hora: '2026-04-22T14:00:00Z',
    tipo: 'consulta',
    protocolos_previstos: ['MUL', 'DRM'],
    status: 'agendado',
    created_at: '2026-04-15T08:00:00Z',
    paciente: { nome: 'Paula Lima', matricula: 'MSP-008', setor: 'Segurança do Trabalho' },
  },
]

// ── Indicadores mensais (out/25 → mar/26) ────────────────────
export const demoIndicadores: IndicadoresEmpresa[] = [
  { id: 'ind-01', empresa_id: EMP_ID, competencia: '2025-10-01', total_pacientes: 5, has_controlados_pct: 25, dm_controlados_pct: 20, tab_cessacao_pct: 0, taxa_controle_geral: 20, roi_estimado: 32000, created_at: '2025-11-01T00:00:00Z' },
  { id: 'ind-02', empresa_id: EMP_ID, competencia: '2025-11-01', total_pacientes: 6, has_controlados_pct: 30, dm_controlados_pct: 25, tab_cessacao_pct: 10, taxa_controle_geral: 24, roi_estimado: 38400, created_at: '2025-12-01T00:00:00Z' },
  { id: 'ind-03', empresa_id: EMP_ID, competencia: '2025-12-01', total_pacientes: 7, has_controlados_pct: 35, dm_controlados_pct: 28, tab_cessacao_pct: 10, taxa_controle_geral: 28, roi_estimado: 44800, created_at: '2026-01-01T00:00:00Z' },
  { id: 'ind-04', empresa_id: EMP_ID, competencia: '2026-01-01', total_pacientes: 7, has_controlados_pct: 38, dm_controlados_pct: 30, tab_cessacao_pct: 15, taxa_controle_geral: 30, roi_estimado: 48000, created_at: '2026-02-01T00:00:00Z' },
  { id: 'ind-05', empresa_id: EMP_ID, competencia: '2026-02-01', total_pacientes: 8, has_controlados_pct: 40, dm_controlados_pct: 33, tab_cessacao_pct: 20, taxa_controle_geral: 33, roi_estimado: 52800, created_at: '2026-03-01T00:00:00Z' },
  { id: 'ind-06', empresa_id: EMP_ID, competencia: '2026-03-01', total_pacientes: 8, has_controlados_pct: 42, dm_controlados_pct: 35, tab_cessacao_pct: 25, taxa_controle_geral: 37, roi_estimado: 59200, created_at: '2026-04-01T00:00:00Z' },
]

// ── Helpers ───────────────────────────────────────────────────
export function getLinhasByPaciente(pacienteId: string): LinhaCuidado[] {
  return demoLinhas.filter(l => l.paciente_id === pacienteId)
}

export function getAlertasByPaciente(pacienteId: string): Alerta[] {
  return demoAlertas.filter(a => a.paciente_id === pacienteId && !a.resolvido)
}

export function getConsultasByPaciente(pacienteId: string): Consulta[] {
  return demoConsultas
    .filter(c => c.paciente_id === pacienteId)
    .sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime())
}

export function getExamesByPaciente(pacienteId: string): ExameResultado[] {
  return demoExames
    .filter(e => e.paciente_id === pacienteId)
    .sort((a, b) => new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime())
}

export function calcularIdade(dataNascimento: string): number {
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export function getControleGeral(linhas: LinhaCuidado[]): { controladas: number; total: number; pct: number } {
  const ativas = linhas.filter(l => l.status === 'ativo')
  const controladas = ativas.filter(l => l.nivel_gravidade === 'controlado').length
  return { controladas, total: ativas.length, pct: ativas.length ? Math.round((controladas / ativas.length) * 100) : 0 }
}

export function getProximoRetorno(consultas: Consulta[]): string | null {
  const futuras = consultas
    .filter(c => c.data_proximo_retorno && new Date(c.data_proximo_retorno) > new Date())
    .sort((a, b) => new Date(a.data_proximo_retorno!).getTime() - new Date(b.data_proximo_retorno!).getTime())
  return futuras[0]?.data_proximo_retorno ?? null
}
