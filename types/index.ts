export type StatusControle = 'controlado' | 'parcial' | 'descontrolado'
export type PrioridadeAlerta = 'urgente' | 'atencao' | 'informativo'

export interface Empresa {
  id: string
  nome: string
  cnpj: string
  total_colaboradores: number
  created_at: string
}

export interface Profissional {
  id: string
  user_id: string
  nome: string
  crm?: string
  coren?: string
  cargo: string
  empresa_id: string
  ativo: boolean
  created_at: string
}

export interface Paciente {
  id: string
  empresa_id: string
  matricula: string
  nome: string
  data_nascimento: string
  sexo: 'M' | 'F' | 'O'
  setor?: string
  comorbidades: string[]
  medicamentos_uso?: string
  tabagismo_status?: 'nunca' | 'ex' | 'atual'
  tabagismo_macos_ano?: number
  ativo: boolean
  created_at: string
}

export interface LinhaCuidado {
  id: string
  paciente_id: string
  protocolo_codigo: string
  status: 'ativo' | 'inativo' | 'alta'
  nivel_gravidade?: StatusControle
  profissional_id?: string
  created_at: string
  updated_at: string
}

export interface Consulta {
  id: string
  paciente_id: string
  profissional_id: string
  data_consulta: string
  tipo: 'consulta' | 'retorno' | 'triagem' | 'urgencia'
  protocolos_abordados: string[]
  pa_sistolica?: number
  pa_diastolica?: number
  fc?: number
  spo2?: number
  peso?: number
  altura?: number
  imc?: number
  circunferencia_abdominal?: number
  glicemia_capilar?: number
  subjetivo?: string
  objetivo?: string
  avaliacao?: string
  plano?: string
  escalas: Record<string, unknown>
  exames_solicitados: string[]
  prescricoes?: string
  retorno_em_dias?: number
  data_proximo_retorno?: string
  created_at: string
}

export interface EvolucaoClinica {
  id: string
  paciente_id: string
  consulta_id?: string
  protocolo_codigo: string
  metricas: Record<string, unknown>
  passo_protocolo?: number
  status_controle?: StatusControle
  created_at: string
}

export interface ExameResultado {
  id: string
  paciente_id: string
  nome_exame: string
  resultado?: string
  valor_numerico?: number
  data_coleta: string
  status: 'pendente' | 'coletado' | 'resultado_disponivel' | 'cancelado'
  created_at: string
}

export type AlertaTipo =
  | 'retorno_vencido'
  | 'exame_atrasado'
  | 'meta_nao_atingida'
  | 'urgencia'
  | 'phq9_critico'
  | 'risco_suicidio'
  | 'gad7_critico'
  | 'cat_critico'
  | 'audit_critico'
  | 'paciente_detrator'

export interface Alerta {
  id: string
  paciente_id: string
  empresa_id: string
  protocolo_codigo: string
  tipo: AlertaTipo
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  titulo: string
  descricao?: string
  data_vencimento?: string
  dias_atraso: number
  resolvido: boolean
  created_at: string
  resolved_at?: string
  metadata?: Record<string, unknown> | null
  paciente?: Pick<Paciente, 'nome' | 'matricula'>
}

export interface Agendamento {
  id: string
  paciente_id: string
  profissional_id?: string
  data_hora: string
  tipo: 'consulta' | 'retorno' | 'triagem' | 'exame'
  protocolos_previstos: string[]
  status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'faltou'
  created_at: string
  paciente?: Pick<Paciente, 'nome' | 'matricula' | 'setor'>
}

export interface IndicadoresEmpresa {
  id: string
  empresa_id: string
  competencia: string
  total_pacientes: number
  has_controlados_pct?: number
  dm_controlados_pct?: number
  tab_cessacao_pct?: number
  taxa_controle_geral?: number
  roi_estimado?: number
  created_at: string
}

export function prioridadeToUI(prioridade: Alerta['prioridade']): PrioridadeAlerta {
  if (prioridade === 'critica' || prioridade === 'alta') return 'urgente'
  if (prioridade === 'media') return 'atencao'
  return 'informativo'
}
