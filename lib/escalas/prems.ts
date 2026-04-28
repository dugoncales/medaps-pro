// MedAPS Pro — PREMs (Patient-Reported Experience Measures)
//
// Três instrumentos:
//   - PREM-GLOBAL    (5 perguntas, aplicar a cada consulta)
//   - PREM-AMPLIADO  (10 perguntas, baseado em Picker PPE-15 + NHS FFT, trimestral)
//   - PREM-PROTOCOLO (1 pergunta específica por linha de cuidado)
//
// Métricas:
//   - NPS = %Promotores(9-10) − %Detratores(0-6)
//   - Likert: média 1-5; meta clínica ≥ 4.2

export type PremCodigo = 'GLOBAL' | 'AMPLIADO' | 'PROTOCOLO'

export type PremPerguntaTipo = 'likert5' | 'nps10'

export interface PremPergunta {
  id: string
  texto: string
  tipo: PremPerguntaTipo
  /** Para PREM-PROTOCOLO: códigos das linhas em que essa pergunta se aplica */
  protocolos?: string[]
}

export interface PremDefinicao {
  codigo: PremCodigo
  nome: string
  descricao: string
  cadencia: string
  perguntas: PremPergunta[]
}

const LIKERT5_LABELS = [
  'Muito ruim',
  'Ruim',
  'Neutro',
  'Bom',
  'Muito bom',
] as const

export const LIKERT_LABELS: readonly string[] = LIKERT5_LABELS

// ─── PREM-GLOBAL ──────────────────────────────────────────────────────────────

export const PREM_GLOBAL: PremDefinicao = {
  codigo: 'GLOBAL',
  nome: 'PREM Global',
  descricao: 'Avaliação rápida da experiência da consulta atual.',
  cadencia: 'A cada consulta',
  perguntas: [
    { id: 'agendamento',  texto: 'Você conseguiu agendar com facilidade?',                      tipo: 'likert5' },
    { id: 'tempo_espera', texto: 'O tempo de espera foi adequado?',                              tipo: 'likert5' },
    { id: 'escuta',       texto: 'O profissional ouviu suas queixas?',                           tipo: 'likert5' },
    { id: 'orientacoes',  texto: 'As orientações recebidas foram claras?',                       tipo: 'likert5' },
    { id: 'nps',          texto: 'De 0 a 10, o quanto você recomendaria a um amigo ou colega?',  tipo: 'nps10' },
  ],
}

// ─── PREM-AMPLIADO (PPE-15 + NHS FFT, simplificado) ──────────────────────────

export const PREM_AMPLIADO: PremDefinicao = {
  codigo: 'AMPLIADO',
  nome: 'PREM Ampliado',
  descricao: 'Picker PPE-15 + NHS FFT — aplicar trimestralmente.',
  cadencia: 'Trimestral',
  perguntas: [
    { id: 'respeito',         texto: 'Fui tratado(a) com respeito e dignidade.',                       tipo: 'likert5' },
    { id: 'privacidade',      texto: 'Minha privacidade e confidencialidade foram preservadas.',       tipo: 'likert5' },
    { id: 'decisao',          texto: 'Participei das decisões sobre meu cuidado.',                     tipo: 'likert5' },
    { id: 'informacao',       texto: 'Recebi informações claras pós-consulta.',                        tipo: 'likert5' },
    { id: 'coordenacao',      texto: 'Senti coordenação entre os profissionais que me atenderam.',     tipo: 'likert5' },
    { id: 'tempo',            texto: 'O tempo da consulta foi suficiente para minhas necessidades.',   tipo: 'likert5' },
    { id: 'exames',           texto: 'Os resultados dos exames me foram explicados.',                  tipo: 'likert5' },
    { id: 'apoio_emocional',  texto: 'Recebi apoio emocional para lidar com meu autocuidado.',         tipo: 'likert5' },
    { id: 'contato',          texto: 'É fácil entrar em contato com a equipe quando preciso.',         tipo: 'likert5' },
    { id: 'satisfacao_final', texto: 'Estou satisfeito(a) com os resultados do meu tratamento.',       tipo: 'likert5' },
  ],
}

// ─── PREM-PROTOCOLO (perguntas específicas por linha) ────────────────────────

export const PREM_PROTOCOLO: PremDefinicao = {
  codigo: 'PROTOCOLO',
  nome: 'PREM por Protocolo',
  descricao: 'Pergunta específica de cada linha de cuidado.',
  cadencia: 'Por consulta',
  perguntas: [
    { id: 'dm_orientacao',  texto: 'Recebi orientações claras sobre o cuidado com o diabetes.',                  tipo: 'likert5', protocolos: ['DM'] },
    { id: 'has_orientacao', texto: 'Recebi orientações claras sobre o controle da minha pressão.',               tipo: 'likert5', protocolos: ['HAS'] },
    { id: 'dpc_inalador',   texto: 'Fui ensinado(a) a usar corretamente o inalador / bombinha.',                 tipo: 'likert5', protocolos: ['DPC', 'ASM'] },
    { id: 'sao_cpap',       texto: 'Recebi suporte adequado para usar o CPAP.',                                  tipo: 'likert5', protocolos: ['SAO', 'SAOS'] },
    { id: 'sm_conforto',    texto: 'Sinto-me confortável compartilhando minhas dificuldades emocionais aqui.',   tipo: 'likert5', protocolos: ['SM', 'TAG', 'DEP'] },
    { id: 'lom_expectativa', texto: 'O tratamento atual atende às minhas expectativas para a dor.',              tipo: 'likert5', protocolos: ['LOM', 'DOR'] },
    { id: 'hom_privacidade', texto: 'Tive privacidade adequada para discutir minha saúde sexual.',               tipo: 'likert5', protocolos: ['HOM', 'IIEF'] },
    { id: 'tab_apoio',      texto: 'Senti apoio adequado para tentar parar de fumar.',                           tipo: 'likert5', protocolos: ['TAB'] },
    { id: 'obe_apoio',      texto: 'Recebi apoio nutricional adequado para meu peso.',                           tipo: 'likert5', protocolos: ['OBE'] },
  ],
}

export const PREMS_DEFINICOES: Record<PremCodigo, PremDefinicao> = {
  GLOBAL: PREM_GLOBAL,
  AMPLIADO: PREM_AMPLIADO,
  PROTOCOLO: PREM_PROTOCOLO,
}

// ─── Tipos de resposta ───────────────────────────────────────────────────────

export interface RespostasPREM {
  [perguntaId: string]: number
}

export interface ResultadoPREM {
  codigo: PremCodigo
  respostas: RespostasPREM
  /** Média Likert (apenas perguntas tipo likert5) */
  media_likert: number | null
  /** Pontuação NPS individual desta resposta (0-10), quando houver pergunta NPS */
  nps_individual: number | null
  /** Classificação NPS individual */
  classificacao_nps: 'detrator' | 'neutro' | 'promotor' | null
  /** Score 0-100 derivado da média Likert para uso geral */
  score: number
  classificacao: string
  data: string
}

export interface RegistroPREM {
  id: string
  paciente_id: string
  consulta_id?: string
  envio_id?: string
  tipo: PremCodigo | 'global' | 'ampliado' | 'protocolo'
  protocolo_codigo?: string
  respostas: RespostasPREM
  nps?: number | null
  media_likert?: number | null
  data_aplicacao: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function perguntasPorProtocolo(protocolos: string[]): PremPergunta[] {
  return PREM_PROTOCOLO.perguntas.filter(p =>
    p.protocolos?.some(c => protocolos.includes(c))
  )
}

export function premCompleto(codigo: PremCodigo, respostas: RespostasPREM, protocolosAtivos?: string[]): boolean {
  const def = PREMS_DEFINICOES[codigo]
  const perguntas = codigo === 'PROTOCOLO' && protocolosAtivos
    ? perguntasPorProtocolo(protocolosAtivos)
    : def.perguntas
  if (perguntas.length === 0) return false
  return perguntas.every(p => respostas[p.id] !== undefined)
}

export function calcularResultadoPREM(
  codigo: PremCodigo,
  respostas: RespostasPREM,
  protocolosAtivos?: string[],
): ResultadoPREM {
  const def = PREMS_DEFINICOES[codigo]
  const perguntas = codigo === 'PROTOCOLO' && protocolosAtivos
    ? perguntasPorProtocolo(protocolosAtivos)
    : def.perguntas

  const likertIds = perguntas.filter(p => p.tipo === 'likert5').map(p => p.id)
  const npsId = perguntas.find(p => p.tipo === 'nps10')?.id

  const likertVals = likertIds.map(id => respostas[id]).filter(v => v !== undefined) as number[]
  const media = likertVals.length ? +(likertVals.reduce((a, b) => a + b, 0) / likertVals.length).toFixed(2) : null

  const nps = npsId !== undefined ? respostas[npsId] : null
  const classificacaoNps = nps === null || nps === undefined
    ? null
    : nps <= 6 ? 'detrator' : nps <= 8 ? 'neutro' : 'promotor'

  // Score 0-100 baseado na média Likert (4.2 = meta)
  const score = media !== null ? Math.round((media / 5) * 100) : 0

  let classificacao = 'Sem resposta'
  if (media !== null) {
    if (media >= 4.2) classificacao = 'Excelente experiência'
    else if (media >= 3.5) classificacao = 'Boa experiência'
    else if (media >= 2.5) classificacao = 'Experiência regular'
    else classificacao = 'Experiência insatisfatória'
  }

  return {
    codigo,
    respostas,
    media_likert: media,
    nps_individual: nps ?? null,
    classificacao_nps: classificacaoNps,
    score,
    classificacao,
    data: new Date().toISOString(),
  }
}

// ─── Agregações ──────────────────────────────────────────────────────────────

export interface NpsAgregado {
  atual: number
  delta: number | null
  total: number
  promotores: number
  neutros: number
  detratores: number
  /** Série temporal últimos 6 meses */
  sparkline: number[]
}

function calcularNps(notas: number[]): number {
  if (notas.length === 0) return 0
  const promotores = notas.filter(n => n >= 9).length
  const detratores = notas.filter(n => n <= 6).length
  return Math.round(((promotores - detratores) / notas.length) * 100)
}

export function calcularNpsAgregado(prems: RegistroPREM[]): NpsAgregado {
  const comNps = prems
    .filter(p => p.nps !== null && p.nps !== undefined)
    .map(p => ({ nota: p.nps as number, data: new Date(p.data_aplicacao) }))

  if (comNps.length === 0) {
    return { atual: 0, delta: null, total: 0, promotores: 0, neutros: 0, detratores: 0, sparkline: [] }
  }

  const promotores = comNps.filter(p => p.nota >= 9).length
  const detratores = comNps.filter(p => p.nota <= 6).length
  const neutros = comNps.length - promotores - detratores
  const atual = calcularNps(comNps.map(p => p.nota))

  // Sparkline mensal últimos 6 meses
  const sparkline: number[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const fim = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const notasMes = comNps.filter(p => p.data >= ref && p.data < fim).map(p => p.nota)
    sparkline.push(notasMes.length ? calcularNps(notasMes) : 0)
  }

  const mesAtual = sparkline[sparkline.length - 1]
  const mesAnterior = sparkline[sparkline.length - 2] ?? null
  const delta = mesAnterior !== null ? mesAtual - mesAnterior : null

  return { atual, delta, total: comNps.length, promotores, neutros, detratores, sparkline }
}

export interface DimensaoMedia {
  pergunta_id: string
  texto: string
  media: number
  total_respostas: number
}

export function calcularMediasPorDimensao(prems: RegistroPREM[], codigo: PremCodigo): DimensaoMedia[] {
  const def = PREMS_DEFINICOES[codigo]
  const result: DimensaoMedia[] = []
  for (const p of def.perguntas) {
    if (p.tipo !== 'likert5') continue
    const valores = prems
      .map(r => r.respostas[p.id])
      .filter((v): v is number => typeof v === 'number')
    if (valores.length === 0) continue
    const media = +(valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2)
    result.push({ pergunta_id: p.id, texto: p.texto, media, total_respostas: valores.length })
  }
  return result
}
