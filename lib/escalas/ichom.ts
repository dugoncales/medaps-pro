// MedAPS Pro — Escalas ICHOM (PROMs / PREMs)
//
// Definições, scoring automático e interpretação em português dos
// principais instrumentos do conjunto ICHOM.
//
// Cada escala expõe:
//   - perguntas[]              questões (opções discretas ou slider)
//   - calcularScore(respostas) score numérico
//   - classificar(score)       interpretação em pt-BR
//   - gerarAlertas(score, r)   banners clínicos (amarelo / vermelho / vermelho-urgente)

export type EscalaCodigo =
  | 'PHQ9'
  | 'PHQ2'
  | 'GAD7'
  | 'EQ5D5L'
  | 'HIT6'
  | 'CAT'
  | 'MMRC'
  | 'ACQ5'
  | 'ESS'
  | 'STOPBANG'
  | 'AUDITC'
  | 'AUDIT'
  | 'FAGERSTROM'
  | 'IIEF5'
  | 'EVA_DOR'
  | 'WHO5'
  | 'EPDS'
  | 'DLQI'

export type NivelAlerta = 'amarelo' | 'vermelho' | 'vermelho-urgente'

export interface AlertaEscala {
  nivel: NivelAlerta
  mensagem: string
  recomendacao?: string
}

export interface Opcao {
  valor: number
  label: string
}

export type TipoPergunta = 'opcoes' | 'slider'

export interface Pergunta {
  id: string
  texto: string
  tipo: TipoPergunta
  opcoes?: Opcao[]
  slider?: { min: number; max: number; step?: number; sufixo?: string }
}

export interface ResultadoEscala {
  codigo: EscalaCodigo
  score: number
  classificacao: string
  alertas: AlertaEscala[]
  respostas: Record<string, number>
  data: string
}

export interface DefinicaoEscala {
  codigo: EscalaCodigo
  nome: string
  descricao: string
  protocolosRelacionados: string[]
  perguntas: Pergunta[]
  scoreRange: [number, number]
  // EQ-5D-5L compõe perfil + EVA, sem score único
  semScoreUnico?: boolean
  calcularScore: (respostas: Record<string, number>) => number
  classificar: (score: number, respostas: Record<string, number>) => string
  gerarAlertas: (score: number, respostas: Record<string, number>) => AlertaEscala[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIKERT_PHQ_GAD: Opcao[] = [
  { valor: 0, label: 'Nenhuma vez' },
  { valor: 1, label: 'Vários dias' },
  { valor: 2, label: 'Mais da metade dos dias' },
  { valor: 3, label: 'Quase todos os dias' },
]

const EQ5D_NIVEIS = (acao: string): Opcao[] => [
  { valor: 1, label: `Não tenho problemas para ${acao}` },
  { valor: 2, label: `Tenho problemas leves para ${acao}` },
  { valor: 3, label: `Tenho problemas moderados para ${acao}` },
  { valor: 4, label: `Tenho problemas graves para ${acao}` },
  { valor: 5, label: `Sou incapaz de ${acao}` },
]

function somar(respostas: Record<string, number>, ids: string[]): number {
  return ids.reduce((s, id) => s + (respostas[id] ?? 0), 0)
}

// ─── PHQ-9 ────────────────────────────────────────────────────────────────────

const PHQ9: DefinicaoEscala = {
  codigo: 'PHQ9',
  nome: 'PHQ-9',
  descricao: 'Patient Health Questionnaire — rastreio de depressão (últimas 2 semanas)',
  protocolosRelacionados: ['SM'],
  scoreRange: [0, 27],
  perguntas: [
    'Pouco interesse ou pouco prazer em fazer as coisas',
    'Sentir-se desanimado(a), deprimido(a), ou sem perspectiva',
    'Dificuldade para pegar no sono ou continuar dormindo, ou dormir mais do que de costume',
    'Sentir-se cansado(a) ou com pouca energia',
    'Falta de apetite ou comer demais',
    'Sentir-se mal consigo mesmo(a), ou achar que é um fracasso',
    'Dificuldade de se concentrar (ler jornal, ver TV)',
    'Lentidão para falar ou se mover, ou estar agitado(a) a ponto de outros notarem',
    'Pensar em se ferir, em se matar, ou achar que seria melhor estar morto(a)',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: LIKERT_PHQ_GAD,
  })),
  calcularScore: (r) => somar(r, Array.from({ length: 9 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score <= 4) return 'Sintomas mínimos'
    if (score <= 9) return 'Depressão leve'
    if (score <= 14) return 'Depressão moderada'
    if (score <= 19) return 'Depressão moderadamente grave'
    return 'Depressão grave'
  },
  gerarAlertas: (score, r) => {
    const alertas: AlertaEscala[] = []
    const item9 = r['p9'] ?? 0
    if (item9 > 0) {
      alertas.push({
        nivel: 'vermelho-urgente',
        mensagem: 'Risco de suicídio identificado (item 9 > 0)',
        recomendacao:
          'Avaliação imediata da ideação suicida. Considerar encaminhamento ao CAPS / emergência psiquiátrica. Não liberar paciente sem plano de segurança.',
      })
    }
    if (score >= 20) {
      alertas.push({
        nivel: 'vermelho',
        mensagem: 'Depressão grave (PHQ-9 ≥ 20)',
        recomendacao: 'Indicar farmacoterapia + psicoterapia e considerar encaminhamento ao psiquiatra.',
      })
    } else if (score >= 10) {
      alertas.push({
        nivel: 'amarelo',
        mensagem: 'Sintomas depressivos clinicamente significativos (PHQ-9 ≥ 10)',
        recomendacao: 'Considerar início ou ajuste de antidepressivo e referenciar para psicoterapia.',
      })
    }
    return alertas
  },
}

// ─── GAD-7 ────────────────────────────────────────────────────────────────────

const GAD7: DefinicaoEscala = {
  codigo: 'GAD7',
  nome: 'GAD-7',
  descricao: 'Generalized Anxiety Disorder — rastreio de ansiedade (últimas 2 semanas)',
  protocolosRelacionados: ['TAG', 'SM'],
  scoreRange: [0, 21],
  perguntas: [
    'Sentir-se nervoso(a), ansioso(a) ou no limite',
    'Não conseguir parar ou controlar as preocupações',
    'Preocupar-se demais com diferentes coisas',
    'Dificuldade para relaxar',
    'Inquietação a ponto de não conseguir ficar parado(a)',
    'Ficar facilmente aborrecido(a) ou irritado(a)',
    'Sentir medo como se algo terrível fosse acontecer',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: LIKERT_PHQ_GAD,
  })),
  calcularScore: (r) => somar(r, Array.from({ length: 7 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score <= 4) return 'Ansiedade mínima'
    if (score <= 9) return 'Ansiedade leve'
    if (score <= 14) return 'Ansiedade moderada'
    return 'Ansiedade grave'
  },
  gerarAlertas: (score) => {
    if (score >= 15) {
      return [{
        nivel: 'vermelho',
        mensagem: 'Ansiedade grave (GAD-7 ≥ 15)',
        recomendacao: 'Iniciar ISRS / ISRSN + TCC. Considerar encaminhamento ao psiquiatra.',
      }]
    }
    if (score >= 10) {
      return [{
        nivel: 'amarelo',
        mensagem: 'Ansiedade moderada (GAD-7 ≥ 10)',
        recomendacao: 'Considerar farmacoterapia e referenciar para TCC.',
      }]
    }
    return []
  },
}

// ─── EQ-5D-5L ─────────────────────────────────────────────────────────────────

const EQ5D5L: DefinicaoEscala = {
  codigo: 'EQ5D5L',
  nome: 'EQ-5D-5L',
  descricao: 'EuroQol-5D — qualidade de vida relacionada à saúde',
  protocolosRelacionados: ['HAS', 'DM', 'OBE', 'DPC', 'ASM', 'SM'],
  scoreRange: [0, 100],
  semScoreUnico: true,
  perguntas: [
    { id: 'mobilidade',   texto: 'Mobilidade',           tipo: 'opcoes', opcoes: EQ5D_NIVEIS('caminhar') },
    { id: 'autocuidado',  texto: 'Cuidados pessoais',    tipo: 'opcoes', opcoes: EQ5D_NIVEIS('me lavar ou me vestir sozinho') },
    { id: 'atividades',   texto: 'Atividades habituais', tipo: 'opcoes', opcoes: EQ5D_NIVEIS('realizar minhas atividades habituais (trabalho, estudos, lazer)') },
    { id: 'dor',          texto: 'Dor / Mal-estar',      tipo: 'opcoes', opcoes: [
      { valor: 1, label: 'Não tenho dor ou mal-estar' },
      { valor: 2, label: 'Tenho dor ou mal-estar leve' },
      { valor: 3, label: 'Tenho dor ou mal-estar moderado' },
      { valor: 4, label: 'Tenho dor ou mal-estar intenso' },
      { valor: 5, label: 'Tenho dor ou mal-estar extremo' },
    ] },
    { id: 'ansiedade',    texto: 'Ansiedade / Depressão', tipo: 'opcoes', opcoes: [
      { valor: 1, label: 'Não estou ansioso(a) ou deprimido(a)' },
      { valor: 2, label: 'Estou um pouco ansioso(a) ou deprimido(a)' },
      { valor: 3, label: 'Estou moderadamente ansioso(a) ou deprimido(a)' },
      { valor: 4, label: 'Estou muito ansioso(a) ou deprimido(a)' },
      { valor: 5, label: 'Estou extremamente ansioso(a) ou deprimido(a)' },
    ] },
    { id: 'eva',          texto: 'EVA — Como você avalia sua saúde HOJE?', tipo: 'slider',
      slider: { min: 0, max: 100, step: 1, sufixo: '/100 (100 = melhor saúde imaginável)' } },
  ],
  calcularScore: (r) => r['eva'] ?? 0,
  classificar: (_score, r) => {
    const perfil = ['mobilidade', 'autocuidado', 'atividades', 'dor', 'ansiedade']
      .map((k) => r[k] ?? 1).join('')
    return `Perfil ${perfil} · EVA ${r['eva'] ?? 0}/100`
  },
  gerarAlertas: (_score, r) => {
    const alertas: AlertaEscala[] = []
    const eva = r['eva'] ?? 0
    if (r['ansiedade'] >= 4) {
      alertas.push({
        nivel: 'amarelo',
        mensagem: 'Sofrimento psíquico relevante na dimensão ansiedade/depressão',
        recomendacao: 'Aplicar PHQ-9 e GAD-7 para rastreio direcionado.',
      })
    }
    if (eva > 0 && eva < 40) {
      alertas.push({
        nivel: 'amarelo',
        mensagem: `Autoavaliação de saúde baixa (EVA = ${eva}/100)`,
        recomendacao: 'Investigar causas e priorizar protocolos com maior impacto na qualidade de vida.',
      })
    }
    return alertas
  },
}

// ─── HIT-6 (Cefaleia) ─────────────────────────────────────────────────────────

const HIT6_OPCOES: Opcao[] = [
  { valor: 6,  label: 'Nunca' },
  { valor: 8,  label: 'Raramente' },
  { valor: 10, label: 'Às vezes' },
  { valor: 11, label: 'Muito frequentemente' },
  { valor: 13, label: 'Sempre' },
]

const HIT6: DefinicaoEscala = {
  codigo: 'HIT6',
  nome: 'HIT-6',
  descricao: 'Headache Impact Test — impacto das cefaleias na vida diária',
  protocolosRelacionados: ['CEF'],
  scoreRange: [36, 78],
  perguntas: [
    'Quando você tem dores de cabeça, com que frequência elas são intensas?',
    'Com que frequência as dores de cabeça limitam suas atividades diárias (trabalho, escola, casa, lazer)?',
    'Quando você tem dor de cabeça, com que frequência sente vontade de se deitar?',
    'Nas últimas 4 semanas, com que frequência você se sentiu cansado(a) demais para trabalhar/realizar atividades por causa de dor de cabeça?',
    'Nas últimas 4 semanas, com que frequência você se sentiu farto(a) ou irritado(a) por causa das suas dores de cabeça?',
    'Nas últimas 4 semanas, com que frequência as dores de cabeça limitaram sua capacidade de se concentrar?',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: HIT6_OPCOES,
  })),
  calcularScore: (r) => somar(r, Array.from({ length: 6 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score <= 49) return 'Pouco ou nenhum impacto'
    if (score <= 55) return 'Algum impacto'
    if (score <= 59) return 'Impacto substancial'
    return 'Impacto severo'
  },
  gerarAlertas: (score) => {
    if (score >= 60) {
      return [{
        nivel: 'vermelho',
        mensagem: 'Impacto severo das cefaleias (HIT-6 ≥ 60)',
        recomendacao: 'Iniciar ou intensificar profilaxia. Considerar encaminhamento ao neurologista.',
      }]
    }
    if (score >= 56) {
      return [{
        nivel: 'amarelo',
        mensagem: 'Impacto substancial (HIT-6 56–59)',
        recomendacao: 'Reavaliar profilaxia e adesão.',
      }]
    }
    return []
  },
}

// ─── CAT (DPOC) ───────────────────────────────────────────────────────────────

const CAT_OPCOES: Opcao[] = Array.from({ length: 6 }, (_, i) => ({
  valor: i,
  label: String(i),
}))

const CAT: DefinicaoEscala = {
  codigo: 'CAT',
  nome: 'CAT',
  descricao: 'COPD Assessment Test — impacto da DPOC',
  protocolosRelacionados: ['DPC'],
  scoreRange: [0, 40],
  perguntas: [
    { id: 'p1', texto: 'Tosse — Nunca tusso (0) ↔ Tusso o tempo todo (5)' },
    { id: 'p2', texto: 'Catarro — Não tenho catarro (0) ↔ Tenho o peito cheio de catarro (5)' },
    { id: 'p3', texto: 'Aperto no peito — Não tenho (0) ↔ Tenho muito aperto (5)' },
    { id: 'p4', texto: 'Falta de ar ao subir escadas — Sem falta de ar (0) ↔ Muita falta de ar (5)' },
    { id: 'p5', texto: 'Limitação em casa — Não me sinto limitado (0) ↔ Muito limitado (5)' },
    { id: 'p6', texto: 'Confiança ao sair de casa — Confiante (0) ↔ Sem confiança (5)' },
    { id: 'p7', texto: 'Sono — Durmo profundamente (0) ↔ Não durmo bem (5)' },
    { id: 'p8', texto: 'Energia — Tenho muita energia (0) ↔ Sem energia nenhuma (5)' },
  ].map((p) => ({ ...p, tipo: 'opcoes' as const, opcoes: CAT_OPCOES })),
  calcularScore: (r) => somar(r, Array.from({ length: 8 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score < 10) return 'Baixo impacto'
    if (score < 21) return 'Médio impacto'
    if (score < 31) return 'Alto impacto'
    return 'Impacto muito alto'
  },
  gerarAlertas: (score) => {
    if (score >= 30) return [{
      nivel: 'vermelho',
      mensagem: 'Impacto muito alto da DPOC (CAT ≥ 30)',
      recomendacao: 'Reavaliar GOLD-ABE, otimizar broncodilatadores, indicar reabilitação pulmonar.',
    }]
    if (score >= 10) return [{
      nivel: 'amarelo',
      mensagem: 'Impacto médio-alto da DPOC',
      recomendacao: 'Considerar escalonamento terapêutico.',
    }]
    return []
  },
}

// ─── ESS (Epworth Sleepiness Scale) ───────────────────────────────────────────

const ESS_OPCOES: Opcao[] = [
  { valor: 0, label: 'Nunca cochilaria' },
  { valor: 1, label: 'Pequena chance' },
  { valor: 2, label: 'Moderada chance' },
  { valor: 3, label: 'Alta chance' },
]

const ESS: DefinicaoEscala = {
  codigo: 'ESS',
  nome: 'Epworth (ESS)',
  descricao: 'Escala de Sonolência de Epworth',
  protocolosRelacionados: ['SAO'],
  scoreRange: [0, 24],
  perguntas: [
    'Sentado(a) e lendo',
    'Assistindo TV',
    'Sentado(a), inativo(a), em local público (cinema, reunião)',
    'Como passageiro(a) em carro por 1 hora sem parar',
    'Deitando para descansar à tarde, quando as circunstâncias permitem',
    'Sentado(a) e conversando com alguém',
    'Sentado(a) calmamente após o almoço (sem álcool)',
    'No carro, parado(a) no trânsito por alguns minutos',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: ESS_OPCOES,
  })),
  calcularScore: (r) => somar(r, Array.from({ length: 8 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score <= 9) return 'Sonolência diurna normal'
    if (score <= 15) return 'Sonolência diurna leve a moderada'
    return 'Sonolência diurna grave'
  },
  gerarAlertas: (score) => {
    if (score >= 16) return [{
      nivel: 'vermelho',
      mensagem: 'Sonolência diurna grave (ESS ≥ 16)',
      recomendacao: 'Solicitar polissonografia. Avaliar segurança ao dirigir / operar máquinas.',
    }]
    if (score >= 10) return [{
      nivel: 'amarelo',
      mensagem: 'Sonolência diurna excessiva (ESS ≥ 10)',
      recomendacao: 'Investigar SAOS — considerar polissonografia.',
    }]
    return []
  },
}

// ─── AUDIT-C ──────────────────────────────────────────────────────────────────

const AUDITC: DefinicaoEscala = {
  codigo: 'AUDITC',
  nome: 'AUDIT-C',
  descricao: 'Rastreio de uso problemático de álcool (versão curta)',
  protocolosRelacionados: ['ALC', 'CHK'],
  scoreRange: [0, 12],
  perguntas: [
    {
      id: 'p1',
      texto: 'Com que frequência você consome bebidas alcoólicas?',
      tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: 'Nunca' },
        { valor: 1, label: 'Mensalmente ou menos' },
        { valor: 2, label: '2 a 4 vezes por mês' },
        { valor: 3, label: '2 a 3 vezes por semana' },
        { valor: 4, label: '4 ou mais vezes por semana' },
      ],
    },
    {
      id: 'p2',
      texto: 'Quantas doses você consome num dia normal em que está bebendo?',
      tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: '1 ou 2' },
        { valor: 1, label: '3 ou 4' },
        { valor: 2, label: '5 ou 6' },
        { valor: 3, label: '7, 8 ou 9' },
        { valor: 4, label: '10 ou mais' },
      ],
    },
    {
      id: 'p3',
      texto: 'Com que frequência você consome 6 ou mais doses em uma única ocasião?',
      tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: 'Nunca' },
        { valor: 1, label: 'Menos que mensalmente' },
        { valor: 2, label: 'Mensalmente' },
        { valor: 3, label: 'Semanalmente' },
        { valor: 4, label: 'Diariamente / quase' },
      ],
    },
  ],
  calcularScore: (r) => somar(r, ['p1', 'p2', 'p3']),
  classificar: (score) => {
    if (score <= 3) return 'Consumo de baixo risco'
    if (score <= 7) return 'Consumo de risco'
    return 'Provável dependência alcoólica'
  },
  gerarAlertas: (score) => {
    if (score >= 8) return [{
      nivel: 'vermelho',
      mensagem: 'Provável transtorno por uso de álcool (AUDIT-C ≥ 8)',
      recomendacao: 'Avaliar com AUDIT completo. Iniciar abordagem motivacional + farmacoterapia.',
    }]
    if (score >= 4) return [{
      nivel: 'amarelo',
      mensagem: 'Consumo de risco (AUDIT-C ≥ 4)',
      recomendacao: 'Aconselhamento breve estruturado.',
    }]
    return []
  },
}

// ─── Fagerström (FTND) ────────────────────────────────────────────────────────

const FAGERSTROM: DefinicaoEscala = {
  codigo: 'FAGERSTROM',
  nome: 'Fagerström',
  descricao: 'Teste de dependência de nicotina (FTND)',
  protocolosRelacionados: ['TAB'],
  scoreRange: [0, 10],
  perguntas: [
    {
      id: 'p1', texto: 'Quanto tempo após acordar você fuma o primeiro cigarro?', tipo: 'opcoes',
      opcoes: [
        { valor: 3, label: 'Em 5 minutos' },
        { valor: 2, label: 'Entre 6 e 30 minutos' },
        { valor: 1, label: 'Entre 31 e 60 minutos' },
        { valor: 0, label: 'Mais de 60 minutos' },
      ],
    },
    {
      id: 'p2', texto: 'É difícil não fumar em locais proibidos?', tipo: 'opcoes',
      opcoes: [{ valor: 1, label: 'Sim' }, { valor: 0, label: 'Não' }],
    },
    {
      id: 'p3', texto: 'Qual cigarro do dia traz mais satisfação?', tipo: 'opcoes',
      opcoes: [{ valor: 1, label: 'O primeiro da manhã' }, { valor: 0, label: 'Outros' }],
    },
    {
      id: 'p4', texto: 'Quantos cigarros você fuma por dia?', tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: 'Até 10' },
        { valor: 1, label: '11 a 20' },
        { valor: 2, label: '21 a 30' },
        { valor: 3, label: '31 ou mais' },
      ],
    },
    {
      id: 'p5', texto: 'Você fuma mais nas primeiras horas após acordar do que durante o resto do dia?',
      tipo: 'opcoes',
      opcoes: [{ valor: 1, label: 'Sim' }, { valor: 0, label: 'Não' }],
    },
    {
      id: 'p6', texto: 'Você fuma mesmo doente, acamado a maior parte do dia?', tipo: 'opcoes',
      opcoes: [{ valor: 1, label: 'Sim' }, { valor: 0, label: 'Não' }],
    },
  ],
  calcularScore: (r) => somar(r, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']),
  classificar: (score) => {
    if (score <= 2) return 'Dependência muito baixa'
    if (score <= 4) return 'Dependência baixa'
    if (score === 5) return 'Dependência média'
    if (score <= 7) return 'Dependência elevada'
    return 'Dependência muito elevada'
  },
  gerarAlertas: (score) => {
    if (score >= 8) return [{
      nivel: 'vermelho',
      mensagem: 'Dependência nicotínica muito elevada (Fagerström ≥ 8)',
      recomendacao: 'Indicar TRN combinada (adesivo + chiclete/pastilha) ou Vareniclina.',
    }]
    if (score >= 5) return [{
      nivel: 'amarelo',
      mensagem: 'Dependência nicotínica moderada-alta',
      recomendacao: 'Indicar farmacoterapia (TRN, Bupropiona ou Vareniclina) + abordagem cognitivo-comportamental.',
    }]
    return []
  },
}

// ─── IIEF-5 ───────────────────────────────────────────────────────────────────

const IIEF5_OPCOES: Opcao[] = [
  { valor: 1, label: 'Quase nunca / nunca' },
  { valor: 2, label: 'Poucas vezes' },
  { valor: 3, label: 'Algumas vezes' },
  { valor: 4, label: 'Maioria das vezes' },
  { valor: 5, label: 'Quase sempre / sempre' },
]

const IIEF5: DefinicaoEscala = {
  codigo: 'IIEF5',
  nome: 'IIEF-5',
  descricao: 'International Index of Erectile Function — disfunção erétil',
  protocolosRelacionados: ['HOM'],
  scoreRange: [5, 25],
  perguntas: [
    'Como você classifica sua confiança para conseguir e manter uma ereção?',
    'Quando teve ereções com estimulação sexual, com que frequência foram firmes o suficiente para a penetração?',
    'Durante a relação sexual, com que frequência conseguiu manter a ereção após a penetração?',
    'Durante a relação, qual a dificuldade para manter a ereção até o fim?',
    'Quando tentou ter relações sexuais, com que frequência foi satisfatório?',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: IIEF5_OPCOES,
  })),
  calcularScore: (r) => somar(r, ['p1', 'p2', 'p3', 'p4', 'p5']),
  classificar: (score) => {
    if (score >= 22) return 'Sem disfunção erétil'
    if (score >= 17) return 'Disfunção erétil leve'
    if (score >= 12) return 'Disfunção erétil leve a moderada'
    if (score >= 8) return 'Disfunção erétil moderada'
    return 'Disfunção erétil grave'
  },
  gerarAlertas: (score) => {
    if (score > 0 && score <= 11) return [{
      nivel: 'amarelo',
      mensagem: `Disfunção erétil ${score <= 7 ? 'grave' : 'moderada'}`,
      recomendacao: 'Investigar causas (testosterona, fatores vasculares, psicogênicos). Considerar iPDE5.',
    }]
    return []
  },
}

// ─── EVA Dor ──────────────────────────────────────────────────────────────────

const EVA_DOR: DefinicaoEscala = {
  codigo: 'EVA_DOR',
  nome: 'EVA — Dor',
  descricao: 'Escala Visual Analógica de dor (0–10)',
  protocolosRelacionados: ['LOM', 'CEF'],
  scoreRange: [0, 10],
  perguntas: [{
    id: 'eva',
    texto: 'Qual a intensidade da sua dor neste momento?',
    tipo: 'slider',
    slider: { min: 0, max: 10, step: 1, sufixo: '/10' },
  }],
  calcularScore: (r) => r['eva'] ?? 0,
  classificar: (score) => {
    if (score === 0) return 'Sem dor'
    if (score <= 3) return 'Dor leve'
    if (score <= 6) return 'Dor moderada'
    return 'Dor intensa'
  },
  gerarAlertas: (score) => {
    if (score >= 7) return [{
      nivel: 'vermelho',
      mensagem: `Dor intensa (EVA ${score}/10)`,
      recomendacao: 'Manejo analgésico imediato. Reavaliar etiologia.',
    }]
    if (score >= 4) return [{
      nivel: 'amarelo',
      mensagem: `Dor moderada (EVA ${score}/10)`,
      recomendacao: 'Otimizar analgesia e seguir reavaliação.',
    }]
    return []
  },
}

// ─── PHQ-2 (rastreio curto de depressão) ─────────────────────────────────────

const PHQ2: DefinicaoEscala = {
  codigo: 'PHQ2',
  nome: 'PHQ-2',
  descricao: 'Rastreio rápido de depressão (2 itens)',
  protocolosRelacionados: ['CHK', 'SM'],
  scoreRange: [0, 6],
  perguntas: [
    'Pouco interesse ou pouco prazer em fazer as coisas',
    'Sentir-se desanimado(a), deprimido(a) ou sem perspectiva',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: LIKERT_PHQ_GAD,
  })),
  calcularScore: (r) => somar(r, ['p1', 'p2']),
  classificar: (score) => (score >= 3 ? 'Rastreio positivo — aplicar PHQ-9' : 'Rastreio negativo'),
  gerarAlertas: (score) =>
    score >= 3
      ? [{
          nivel: 'amarelo',
          mensagem: 'PHQ-2 positivo (≥ 3)',
          recomendacao: 'Aplicar PHQ-9 completo para confirmar e estratificar a depressão.',
        }]
      : [],
}

// ─── WHO-5 ───────────────────────────────────────────────────────────────────

const WHO5_OPCOES: Opcao[] = [
  { valor: 0, label: 'Em nenhum momento' },
  { valor: 1, label: 'Algumas vezes' },
  { valor: 2, label: 'Menos da metade do tempo' },
  { valor: 3, label: 'Mais da metade do tempo' },
  { valor: 4, label: 'A maior parte do tempo' },
  { valor: 5, label: 'Todo o tempo' },
]

const WHO5: DefinicaoEscala = {
  codigo: 'WHO5',
  nome: 'WHO-5',
  descricao: 'Índice de Bem-Estar (últimas 2 semanas) — 0–100',
  protocolosRelacionados: ['DM', 'OBE', 'SME', 'SM'],
  scoreRange: [0, 100],
  perguntas: [
    'Tenho me sentido alegre e de bom humor',
    'Tenho me sentido calmo(a) e relaxado(a)',
    'Tenho me sentido ativo(a) e com vigor',
    'Acordei me sentindo descansado(a) e revigorado(a)',
    'Meu dia a dia tem sido cheio de coisas que me interessam',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: WHO5_OPCOES,
  })),
  calcularScore: (r) => somar(r, ['p1', 'p2', 'p3', 'p4', 'p5']) * 4,
  classificar: (score) => {
    if (score >= 75) return 'Excelente bem-estar'
    if (score >= 50) return 'Bom bem-estar'
    if (score >= 28) return 'Bem-estar reduzido'
    return 'Possível depressão — aplicar PHQ-9'
  },
  gerarAlertas: (score) => {
    if (score < 28) return [{
      nivel: 'vermelho',
      mensagem: `WHO-5 ≤ 28/100 — possível depressão`,
      recomendacao: 'Aplicar PHQ-9 e considerar encaminhamento.',
    }]
    if (score < 50) return [{
      nivel: 'amarelo',
      mensagem: 'Bem-estar reduzido (WHO-5 < 50)',
      recomendacao: 'Investigar causas, aplicar rastreio adicional se persistente.',
    }]
    return []
  },
}

// ─── mMRC (dispneia) ──────────────────────────────────────────────────────────

const MMRC: DefinicaoEscala = {
  codigo: 'MMRC',
  nome: 'mMRC',
  descricao: 'Modified Medical Research Council — escala de dispneia (0–4)',
  protocolosRelacionados: ['DPC', 'ASM'],
  scoreRange: [0, 4],
  perguntas: [{
    id: 'p1',
    texto: 'Qual a frase que melhor descreve sua falta de ar?',
    tipo: 'opcoes',
    opcoes: [
      { valor: 0, label: 'Só tenho falta de ar com exercício intenso' },
      { valor: 1, label: 'Tenho falta de ar quando ando rápido ou subo aclive leve' },
      { valor: 2, label: 'Ando mais devagar que pessoas da mesma idade ou paro para respirar' },
      { valor: 3, label: 'Paro para respirar após andar ~100 m' },
      { valor: 4, label: 'Tenho falta de ar para sair de casa, me vestir ou me despir' },
    ],
  }],
  calcularScore: (r) => r['p1'] ?? 0,
  classificar: (score) => {
    if (score === 0) return 'Sem dispneia significativa'
    if (score === 1) return 'Dispneia leve'
    if (score === 2) return 'Dispneia moderada'
    if (score === 3) return 'Dispneia grave'
    return 'Dispneia muito grave'
  },
  gerarAlertas: (score) => {
    if (score >= 3) return [{
      nivel: 'vermelho',
      mensagem: `Dispneia grave (mMRC ${score})`,
      recomendacao: 'Reavaliar GOLD-ABE, otimizar broncodilatadores, indicar reabilitação pulmonar e oxigenoterapia se SpO₂ baixa.',
    }]
    if (score === 2) return [{
      nivel: 'amarelo',
      mensagem: 'Dispneia moderada (mMRC 2)',
      recomendacao: 'Otimizar terapia inalatória.',
    }]
    return []
  },
}

// ─── ACQ-5 (controle de asma) ─────────────────────────────────────────────────

const ACQ5_OPCOES: Opcao[] = [
  { valor: 0, label: 'Nunca' },
  { valor: 1, label: 'Quase nunca' },
  { valor: 2, label: 'Algumas vezes' },
  { valor: 3, label: 'Várias vezes' },
  { valor: 4, label: 'Muitas vezes' },
  { valor: 5, label: 'A maior parte do tempo' },
  { valor: 6, label: 'O tempo todo' },
]

const ACQ5: DefinicaoEscala = {
  codigo: 'ACQ5',
  nome: 'ACQ-5',
  descricao: 'Asthma Control Questionnaire — controle da asma (média 0–6)',
  protocolosRelacionados: ['ASM'],
  scoreRange: [0, 6],
  perguntas: [
    'Com que frequência você acordou à noite por causa da asma?',
    'Quão graves foram seus sintomas asmáticos ao acordar de manhã?',
    'O quanto suas atividades foram limitadas pela asma?',
    'O quanto você teve falta de ar pela asma?',
    'Com que frequência você teve chiado no peito?',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: ACQ5_OPCOES,
  })),
  calcularScore: (r) => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
    const respondidas = ids.filter((id) => r[id] !== undefined)
    if (respondidas.length === 0) return 0
    const media = somar(r, respondidas) / respondidas.length
    return Math.round(media * 100) / 100
  },
  classificar: (score) => {
    if (score < 0.75) return 'Asma bem controlada'
    if (score < 1.5) return 'Zona cinzenta — vigilância'
    return 'Asma não controlada'
  },
  gerarAlertas: (score) => {
    if (score >= 1.5) return [{
      nivel: 'vermelho',
      mensagem: `Asma não controlada (ACQ-5 ${score.toFixed(2)})`,
      recomendacao: 'Escalonar terapia (Step-up GINA), revisar técnica inalatória e adesão.',
    }]
    if (score >= 0.75) return [{
      nivel: 'amarelo',
      mensagem: `Controle limítrofe (ACQ-5 ${score.toFixed(2)})`,
      recomendacao: 'Reforçar adesão e técnica inalatória.',
    }]
    return []
  },
}

// ─── STOP-BANG ───────────────────────────────────────────────────────────────

const STOPBANG_SIM_NAO: Opcao[] = [
  { valor: 1, label: 'Sim' },
  { valor: 0, label: 'Não' },
]

const STOPBANG: DefinicaoEscala = {
  codigo: 'STOPBANG',
  nome: 'STOP-BANG',
  descricao: 'Rastreio de SAOS (8 questões dicotômicas)',
  protocolosRelacionados: ['SAO'],
  scoreRange: [0, 8],
  perguntas: [
    'S — Você ronca alto (mais alto que a fala ou audível através de portas fechadas)?',
    'T — Sente-se cansado(a), com fadiga ou sonolência diurna frequente?',
    'O — Alguém já observou que você para de respirar ou engasga durante o sono?',
    'P — Você tem ou está em tratamento para hipertensão arterial?',
    'B — IMC > 35 kg/m²?',
    'A — Idade > 50 anos?',
    'N — Circunferência cervical > 40 cm?',
    'G — Sexo masculino?',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: STOPBANG_SIM_NAO,
  })),
  calcularScore: (r) => somar(r, Array.from({ length: 8 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score <= 2) return 'Risco baixo de SAOS'
    if (score <= 4) return 'Risco intermediário de SAOS'
    return 'Risco alto de SAOS'
  },
  gerarAlertas: (score) => {
    if (score >= 5) return [{
      nivel: 'vermelho',
      mensagem: `Alto risco de SAOS (STOP-BANG ${score})`,
      recomendacao: 'Solicitar polissonografia. Avaliar segurança ao dirigir / operar máquinas.',
    }]
    if (score >= 3) return [{
      nivel: 'amarelo',
      mensagem: `Risco intermediário de SAOS (STOP-BANG ${score})`,
      recomendacao: 'Considerar polissonografia conforme contexto clínico.',
    }]
    return []
  },
}

// ─── AUDIT (10 itens) ─────────────────────────────────────────────────────────

const AUDIT: DefinicaoEscala = {
  codigo: 'AUDIT',
  nome: 'AUDIT',
  descricao: 'Alcohol Use Disorders Identification Test — 10 itens',
  protocolosRelacionados: ['ALC'],
  scoreRange: [0, 40],
  perguntas: [
    {
      id: 'p1', texto: 'Com que frequência você consome bebidas alcoólicas?',
      tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: 'Nunca' },
        { valor: 1, label: 'Mensalmente ou menos' },
        { valor: 2, label: '2–4 vezes/mês' },
        { valor: 3, label: '2–3 vezes/semana' },
        { valor: 4, label: '4 ou mais vezes/semana' },
      ],
    },
    {
      id: 'p2', texto: 'Quantas doses num dia comum em que está bebendo?',
      tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: '1 ou 2' }, { valor: 1, label: '3 ou 4' },
        { valor: 2, label: '5 ou 6' }, { valor: 3, label: '7 a 9' },
        { valor: 4, label: '10 ou mais' },
      ],
    },
    {
      id: 'p3', texto: 'Com que frequência você consome 6+ doses em uma única ocasião?',
      tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: 'Nunca' }, { valor: 1, label: 'Menos que mensalmente' },
        { valor: 2, label: 'Mensalmente' }, { valor: 3, label: 'Semanalmente' },
        { valor: 4, label: 'Diariamente / quase' },
      ],
    },
    ...(['Com que frequência você não conseguiu parar de beber depois de começar?',
        'Com que frequência deixou de fazer algo importante por causa do álcool?',
        'Com que frequência precisou beber pela manhã para se recuperar?',
        'Com que frequência sentiu culpa ou remorso após beber?',
        'Com que frequência não lembrou da noite anterior por ter bebido?'] as const).map((texto, idx) => ({
      id: `p${idx + 4}`,
      texto,
      tipo: 'opcoes' as const,
      opcoes: [
        { valor: 0, label: 'Nunca' }, { valor: 1, label: 'Menos que mensalmente' },
        { valor: 2, label: 'Mensalmente' }, { valor: 3, label: 'Semanalmente' },
        { valor: 4, label: 'Diariamente / quase' },
      ],
    })),
    {
      id: 'p9', texto: 'Você ou alguém já se machucou por causa de você beber?',
      tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: 'Não' },
        { valor: 2, label: 'Sim, mas não no último ano' },
        { valor: 4, label: 'Sim, no último ano' },
      ],
    },
    {
      id: 'p10', texto: 'Algum familiar, amigo ou profissional já se preocupou com seu consumo de álcool?',
      tipo: 'opcoes',
      opcoes: [
        { valor: 0, label: 'Não' },
        { valor: 2, label: 'Sim, mas não no último ano' },
        { valor: 4, label: 'Sim, no último ano' },
      ],
    },
  ],
  calcularScore: (r) => somar(r, Array.from({ length: 10 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score <= 7) return 'Consumo de baixo risco'
    if (score <= 15) return 'Uso de risco'
    if (score <= 19) return 'Uso nocivo / dependência provável'
    return 'Provável dependência grave'
  },
  gerarAlertas: (score) => {
    if (score >= 20) return [{
      nivel: 'vermelho',
      mensagem: `Dependência alcoólica provável (AUDIT ${score})`,
      recomendacao: 'Encaminhar para serviço especializado (CAPS-AD). Avaliar farmacoterapia (Naltrexona, Acamprosato).',
    }]
    if (score >= 16) return [{
      nivel: 'vermelho',
      mensagem: `Uso nocivo / provável dependência (AUDIT ${score})`,
      recomendacao: 'Iniciar abordagem motivacional intensiva e considerar farmacoterapia.',
    }]
    if (score >= 8) return [{
      nivel: 'amarelo',
      mensagem: `Consumo de risco (AUDIT ${score})`,
      recomendacao: 'Aconselhamento breve estruturado.',
    }]
    return []
  },
}

// ─── EPDS (Edinburgh Postnatal Depression Scale) ──────────────────────────────

const EPDS: DefinicaoEscala = {
  codigo: 'EPDS',
  nome: 'EPDS',
  descricao: 'Edinburgh Postnatal Depression Scale — depressão perinatal',
  protocolosRelacionados: ['MUL'],
  scoreRange: [0, 30],
  perguntas: [
    {
      id: 'p1', texto: 'Tenho conseguido rir e ver o lado divertido das coisas',
      opcoes: [
        { valor: 0, label: 'Tanto quanto antes' }, { valor: 1, label: 'Não tanto quanto antes' },
        { valor: 2, label: 'Sem dúvida menos que antes' }, { valor: 3, label: 'Não, de jeito nenhum' },
      ],
    },
    {
      id: 'p2', texto: 'Tenho olhado para o futuro com prazer',
      opcoes: [
        { valor: 0, label: 'Tanto quanto antes' }, { valor: 1, label: 'Menos que antes' },
        { valor: 2, label: 'Sem dúvida menos' }, { valor: 3, label: 'Quase nada' },
      ],
    },
    {
      id: 'p3', texto: 'Tenho me culpado sem motivo quando algo dá errado',
      opcoes: [
        { valor: 3, label: 'Sim, na maioria das vezes' }, { valor: 2, label: 'Sim, algumas vezes' },
        { valor: 1, label: 'Quase não' }, { valor: 0, label: 'Não, nunca' },
      ],
    },
    {
      id: 'p4', texto: 'Tenho me sentido ansiosa(o) ou preocupada(o) sem motivo',
      opcoes: [
        { valor: 0, label: 'Não, de jeito nenhum' }, { valor: 1, label: 'Quase nunca' },
        { valor: 2, label: 'Sim, às vezes' }, { valor: 3, label: 'Sim, com frequência' },
      ],
    },
    {
      id: 'p5', texto: 'Tenho me sentido com medo ou em pânico sem motivo',
      opcoes: [
        { valor: 3, label: 'Sim, bastante' }, { valor: 2, label: 'Sim, às vezes' },
        { valor: 1, label: 'Não muito' }, { valor: 0, label: 'Não, de jeito nenhum' },
      ],
    },
    {
      id: 'p6', texto: 'As coisas têm me sobrecarregado',
      opcoes: [
        { valor: 3, label: 'Quase sempre não consigo lidar' }, { valor: 2, label: 'Às vezes não tenho lidado bem' },
        { valor: 1, label: 'Quase sempre tenho lidado bem' }, { valor: 0, label: 'Lido tão bem quanto sempre' },
      ],
    },
    {
      id: 'p7', texto: 'Tenho me sentido tão infeliz que tenho dificuldade para dormir',
      opcoes: [
        { valor: 3, label: 'Quase sempre' }, { valor: 2, label: 'Às vezes' },
        { valor: 1, label: 'Quase nunca' }, { valor: 0, label: 'Não, nunca' },
      ],
    },
    {
      id: 'p8', texto: 'Tenho me sentido triste ou pra baixo',
      opcoes: [
        { valor: 3, label: 'Quase sempre' }, { valor: 2, label: 'Frequentemente' },
        { valor: 1, label: 'Quase nunca' }, { valor: 0, label: 'Não, nunca' },
      ],
    },
    {
      id: 'p9', texto: 'Tenho me sentido tão infeliz que tenho chorado',
      opcoes: [
        { valor: 3, label: 'Quase sempre' }, { valor: 2, label: 'Frequentemente' },
        { valor: 1, label: 'Só às vezes' }, { valor: 0, label: 'Não, nunca' },
      ],
    },
    {
      id: 'p10', texto: 'A ideia de me ferir tem passado pela minha cabeça',
      opcoes: [
        { valor: 3, label: 'Sim, muitas vezes' }, { valor: 2, label: 'Às vezes' },
        { valor: 1, label: 'Quase nunca' }, { valor: 0, label: 'Não, nunca' },
      ],
    },
  ].map((p) => ({ ...p, tipo: 'opcoes' as const })),
  calcularScore: (r) => somar(r, Array.from({ length: 10 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score < 10) return 'Baixa probabilidade de depressão'
    if (score < 13) return 'Sintomas depressivos significativos'
    return 'Provável depressão perinatal'
  },
  gerarAlertas: (score, r) => {
    const alertas: AlertaEscala[] = []
    if ((r['p10'] ?? 0) > 0) {
      alertas.push({
        nivel: 'vermelho-urgente',
        mensagem: 'Risco de autoextermínio (EPDS item 10 > 0)',
        recomendacao: 'Avaliação imediata. Considerar encaminhamento ao CAPS / emergência.',
      })
    }
    if (score >= 13) {
      alertas.push({
        nivel: 'vermelho',
        mensagem: `Provável depressão perinatal (EPDS ${score})`,
        recomendacao: 'Iniciar abordagem (psicoterapia ± farmacoterapia compatível com lactação).',
      })
    } else if (score >= 10) {
      alertas.push({
        nivel: 'amarelo',
        mensagem: `Sintomas depressivos perinatais (EPDS ${score})`,
        recomendacao: 'Monitorar e considerar acompanhamento psicológico.',
      })
    }
    return alertas
  },
}

// ─── DLQI (Dermatology Life Quality Index) ────────────────────────────────────

const DLQI_OPCOES: Opcao[] = [
  { valor: 0, label: 'Não / Não relevante' },
  { valor: 1, label: 'Um pouco' },
  { valor: 2, label: 'Bastante' },
  { valor: 3, label: 'Muito' },
]

const DLQI: DefinicaoEscala = {
  codigo: 'DLQI',
  nome: 'DLQI',
  descricao: 'Dermatology Life Quality Index — impacto da pele na qualidade de vida (última semana)',
  protocolosRelacionados: ['DRM'],
  scoreRange: [0, 30],
  perguntas: [
    'Quanto sua pele coçou, doeu ou ardeu?',
    'Quanto sua pele te deixou constrangido(a)?',
    'Quanto sua pele atrapalhou compras / cuidados com a casa ou jardim?',
    'Quanto sua pele influenciou as roupas que você usou?',
    'Quanto sua pele afetou suas atividades sociais ou lazer?',
    'Quanto sua pele dificultou esportes?',
    'Sua pele te impediu de trabalhar ou estudar?',
    'Quanto sua pele criou problemas com parceiros, amigos ou familiares?',
    'Quanto sua pele causou dificuldades sexuais?',
    'Quanto o tratamento da pele tem sido um problema (sujeira, tempo)?',
  ].map((texto, i) => ({
    id: `p${i + 1}`,
    texto,
    tipo: 'opcoes' as const,
    opcoes: DLQI_OPCOES,
  })),
  calcularScore: (r) => somar(r, Array.from({ length: 10 }, (_, i) => `p${i + 1}`)),
  classificar: (score) => {
    if (score <= 1) return 'Sem impacto'
    if (score <= 5) return 'Pequeno impacto'
    if (score <= 10) return 'Impacto moderado'
    if (score <= 20) return 'Impacto muito grande'
    return 'Impacto extremamente grande'
  },
  gerarAlertas: (score) => {
    if (score > 10) return [{
      nivel: 'amarelo',
      mensagem: `DLQI ${score} — impacto significativo na qualidade de vida`,
      recomendacao: 'Reavaliar diagnóstico e escalonar terapia tópica/sistêmica.',
    }]
    return []
  },
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ESCALAS: Record<EscalaCodigo, DefinicaoEscala> = {
  PHQ9, PHQ2, GAD7, EQ5D5L, HIT6, CAT, MMRC, ACQ5, ESS, STOPBANG,
  AUDITC, AUDIT, FAGERSTROM, IIEF5, EVA_DOR, WHO5, EPDS, DLQI,
}

export const ESCALAS_LIST: DefinicaoEscala[] = Object.values(ESCALAS)

// ─── Mapa Protocolo → Escalas (com flag obrigatória) ─────────────────────────
//
// Para cada protocolo ativo, indica quais escalas ICHOM devem ser oferecidas
// ao profissional, e quais são clinicamente obrigatórias para o conjunto
// padrão definido pelo ICHOM.

export interface EscalaSugestao {
  codigo: EscalaCodigo
  obrigatoria: boolean
  motivo: string  // protocolo ou indicação que originou a sugestão
}

const PROTOCOLO_ESCALAS: Record<string, Array<{ codigo: EscalaCodigo; obrigatoria: boolean }>> = {
  HAS:  [{ codigo: 'EQ5D5L',     obrigatoria: true }],
  DM:   [{ codigo: 'EQ5D5L',     obrigatoria: true }, { codigo: 'WHO5', obrigatoria: false }],
  TAG:  [{ codigo: 'GAD7',       obrigatoria: true }, { codigo: 'PHQ9', obrigatoria: false }],
  SM:   [{ codigo: 'PHQ9',       obrigatoria: true }, { codigo: 'GAD7', obrigatoria: true }],
  DPC:  [{ codigo: 'CAT',        obrigatoria: true }, { codigo: 'MMRC', obrigatoria: true }, { codigo: 'EQ5D5L', obrigatoria: false }],
  ASM:  [{ codigo: 'ACQ5',       obrigatoria: true }, { codigo: 'EQ5D5L', obrigatoria: false }],
  SAO:  [{ codigo: 'ESS',        obrigatoria: true }, { codigo: 'STOPBANG', obrigatoria: true }, { codigo: 'EQ5D5L', obrigatoria: false }],
  TAB:  [{ codigo: 'FAGERSTROM', obrigatoria: true }, { codigo: 'EQ5D5L', obrigatoria: false }],
  ALC:  [{ codigo: 'AUDITC',     obrigatoria: true }, { codigo: 'AUDIT', obrigatoria: false }, { codigo: 'PHQ9', obrigatoria: false }],
  CEF:  [{ codigo: 'HIT6',       obrigatoria: true }, { codigo: 'EVA_DOR', obrigatoria: true }, { codigo: 'EQ5D5L', obrigatoria: false }],
  LOM:  [{ codigo: 'EVA_DOR',    obrigatoria: true }, { codigo: 'EQ5D5L', obrigatoria: false }],
  GOT:  [{ codigo: 'EVA_DOR',    obrigatoria: true }, { codigo: 'EQ5D5L', obrigatoria: false }],
  HOM:  [{ codigo: 'IIEF5',      obrigatoria: false }, { codigo: 'PHQ9', obrigatoria: false }, { codigo: 'AUDITC', obrigatoria: false }],
  MUL:  [{ codigo: 'EPDS',       obrigatoria: false }, { codigo: 'PHQ9', obrigatoria: false }, { codigo: 'EQ5D5L', obrigatoria: false }],
  OBE:  [{ codigo: 'EQ5D5L',     obrigatoria: true }, { codigo: 'WHO5', obrigatoria: false }],
  DIS:  [{ codigo: 'EQ5D5L',     obrigatoria: true }],
  HIP:  [{ codigo: 'EQ5D5L',     obrigatoria: true }],
  SME:  [{ codigo: 'EQ5D5L',     obrigatoria: true }, { codigo: 'WHO5', obrigatoria: false }],
  DRM:  [{ codigo: 'DLQI',       obrigatoria: false }, { codigo: 'EVA_DOR', obrigatoria: false }],
  CHK:  [{ codigo: 'PHQ2',       obrigatoria: true }, { codigo: 'AUDITC', obrigatoria: true }, { codigo: 'EQ5D5L', obrigatoria: false }],
}

// Devolve a lista deduplicada de escalas a oferecer para o conjunto de
// protocolos ativos. Para a mesma escala, prevalece a marcação "obrigatória"
// quando ao menos um dos protocolos a exigir.
export function getEscalasParaProtocolos(protocolosAtivos: string[]): EscalaSugestao[] {
  const map = new Map<EscalaCodigo, EscalaSugestao>()
  for (const cod of protocolosAtivos) {
    const itens = PROTOCOLO_ESCALAS[cod] ?? []
    for (const item of itens) {
      const existente = map.get(item.codigo)
      if (!existente) {
        map.set(item.codigo, { codigo: item.codigo, obrigatoria: item.obrigatoria, motivo: cod })
      } else if (item.obrigatoria && !existente.obrigatoria) {
        map.set(item.codigo, { ...existente, obrigatoria: true, motivo: cod })
      }
    }
  }
  return Array.from(map.values())
}

// Mantido por compat — devolve só os códigos
export function sugerirEscalas(protocolosAtivos: string[]): EscalaCodigo[] {
  return getEscalasParaProtocolos(protocolosAtivos).map((e) => e.codigo)
}

// Calcula resultado completo para uma escala
export function calcularResultado(
  codigo: EscalaCodigo,
  respostas: Record<string, number>,
): ResultadoEscala {
  const def = ESCALAS[codigo]
  const score = def.calcularScore(respostas)
  return {
    codigo,
    score,
    classificacao: def.classificar(score, respostas),
    alertas: def.gerarAlertas(score, respostas),
    respostas,
    data: new Date().toISOString(),
  }
}

// Verifica se todas as perguntas obrigatórias foram respondidas
export function escalaCompleta(codigo: EscalaCodigo, respostas: Record<string, number>): boolean {
  return ESCALAS[codigo].perguntas.every((p) => respostas[p.id] !== undefined && respostas[p.id] !== null)
}
