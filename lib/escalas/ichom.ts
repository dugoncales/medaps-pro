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
  | 'GAD7'
  | 'EQ5D5L'
  | 'HIT6'
  | 'CAT'
  | 'ESS'
  | 'AUDITC'
  | 'FAGERSTROM'
  | 'IIEF5'
  | 'EVA_DOR'

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

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ESCALAS: Record<EscalaCodigo, DefinicaoEscala> = {
  PHQ9, GAD7, EQ5D5L, HIT6, CAT, ESS, AUDITC, FAGERSTROM, IIEF5, EVA_DOR,
}

export const ESCALAS_LIST: DefinicaoEscala[] = Object.values(ESCALAS)

// Sugere escalas a aplicar baseado nos protocolos ativos do paciente
export function sugerirEscalas(protocolosAtivos: string[]): EscalaCodigo[] {
  const sugeridas = new Set<EscalaCodigo>()
  for (const def of ESCALAS_LIST) {
    if (def.protocolosRelacionados.some((p) => protocolosAtivos.includes(p))) {
      sugeridas.add(def.codigo)
    }
  }
  // EQ-5D-5L é genérico — aplica em qualquer paciente com protocolo crônico
  if (protocolosAtivos.length > 0) sugeridas.add('EQ5D5L')
  return Array.from(sugeridas)
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
