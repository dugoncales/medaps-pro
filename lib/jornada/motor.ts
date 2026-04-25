import { PROTOCOLO_MAP, calcularStatusControle } from '@/lib/protocolos'

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface AcaoPendente {
  tipo: 'consulta' | 'exame' | 'escala' | 'encaminhamento' | 'medicacao' | 'vacina'
  prioridade: 'urgente' | 'alta' | 'media' | 'baixa'
  titulo: string
  descricao: string
  prazo_dias: number
  protocolo: string
  passo: number
  bloqueante: boolean
}

export interface StatusJornada {
  paciente_id: string
  protocolo: string
  passo_atual: number
  titulo_passo: string
  percentual_conclusao: number
  acoes_pendentes: AcaoPendente[]
  acoes_concluidas: string[]
  proximo_passo: string
  status_controle: 'controlado' | 'parcial' | 'descontrolado'
  data_prevista_avanco: Date | null
  dias_no_passo_atual: number
  alerta_estagnacao: boolean
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function hasKey(m: Record<string, any>, key: string): boolean {
  const v = m[key]
  return v !== undefined && v !== null && v !== ''
}

function num(m: Record<string, any>, key: string): number | undefined {
  const v = m[key]
  if (v === undefined || v === null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function bool(m: Record<string, any>, key: string): boolean {
  return m[key] === true || m[key] === 'true' || m[key] === 1
}

function hasExame(exames: any[], nome: string, maxDias?: number): boolean {
  const hoje = Date.now()
  return exames.some(e => {
    if (!String(e.nome_exame ?? '').toLowerCase().includes(nome.toLowerCase())) return false
    if (maxDias !== undefined) {
      const diff = (hoje - new Date(e.data_coleta).getTime()) / 86400000
      return diff <= maxDias
    }
    return true
  })
}

function paControlada2x(consultas: any[]): boolean {
  const com = [...consultas]
    .filter(c => c.pa_sistolica && c.pa_diastolica)
    .sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime())
    .slice(0, 2)
  if (com.length < 2) return false
  return com.every(c => Number(c.pa_sistolica) < 130 && Number(c.pa_diastolica) < 80)
}

function hba1cControlada2x(exames: any[]): boolean {
  const com = [...exames]
    .filter(e => e.nome_exame?.toLowerCase().includes('hba1c') && e.valor_numerico != null)
    .sort((a, b) => new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime())
    .slice(0, 2)
  if (com.length < 2) return false
  return com.every(e => Number(e.valor_numerico) < 7)
}

function contarConsultasComMetrica(consultas: any[], key: string, diasJanela: number): number {
  const limite = Date.now() - diasJanela * 86400000
  return consultas.filter(c => {
    if (new Date(c.data_consulta).getTime() < limite) return false
    const m: Record<string, any> = c.metricas ?? c.escalas ?? {}
    return hasKey(m, key)
  }).length
}

function diasNoPasso(consultas: any[], passo: number): number {
  const com = consultas
    .filter(c => Number(c.passo_protocolo) === passo)
    .sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime())
  if (!com.length) return 0
  return Math.floor((Date.now() - new Date(com[0].data_consulta).getTime()) / 86400000)
}

// Expected days per step index [0..4] = steps 1..5
const DURACAO_PASSO: Record<string, number[]> = {
  HAS: [14, 30, 45, 45, 365],
  DM:  [30, 45, 90, 90, 365],
  TAB: [14, 14, 30, 60, 180],
  TAG: [14, 30, 30, 90, 365],
  CHK: [ 7, 30, 14, 14, 365],
  GOT: [ 7, 14, 30, 60, 365],
  ALC: [14, 14, 30, 90, 180],
  OBE: [14, 60, 90, 180, 365],
  DIS: [14, 60, 90,  90, 365],
  SM:  [14, 14, 30,  90, 365],
  HIP: [14, 30, 60,  60, 365],
  DPC: [14, 14, 30,  60, 365],
  SME: [14, 60, 60,  60, 365],
  CEF: [14, 14, 30,  90, 365],
  ASM: [14, 14, 30,  30, 365],
  SAO: [14, 30, 30,  90, 365],
  DRM: [ 7, 14, 14,  30,  90],
  HOM: [14, 30, 30,  30, 365],
  MUL: [14, 30, 30,  30, 365],
  LOM: [ 7,  7, 14,  30,  90],
}

// ─── Per-protocol criteria ────────────────────────────────────────────────────

function criteriosHAS(passo: number, m: Record<string, any>, consultas: any[], exames: any[]): AcaoPendente[] {
  const p: AcaoPendente[] = []

  switch (passo) {
    case 1:
      if (!hasKey(m, 'pa_sistolica') || !hasKey(m, 'pa_diastolica'))
        p.push({ tipo: 'consulta', prioridade: 'urgente', titulo: 'Aferir PA em 2 momentos distintos',
          descricao: 'PA sistólica e diastólica são obrigatórias para classificar o grau de HAS.',
          prazo_dias: 0, protocolo: 'HAS', passo, bloqueante: true })
      if (!hasKey(m, 'peso'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Registrar peso corporal',
          descricao: 'Necessário para IMC e estratificação de risco cardiovascular.',
          prazo_dias: 0, protocolo: 'HAS', passo, bloqueante: true })
      if (!hasKey(m, 'circunferencia_abdominal'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Medir circunferência abdominal',
          descricao: 'Critério de síndrome metabólica e risco cardiovascular adicional.',
          prazo_dias: 0, protocolo: 'HAS', passo, bloqueante: true })
      break

    case 2:
      if (!hasKey(m, 'classificacao_has') && !hasKey(m, 'classificacao_pa'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Documentar classificação da HAS',
          descricao: 'Registrar: Normal-Alta, HAS 1, HAS 2 ou HAS 3 / Isolada.',
          prazo_dias: 7, protocolo: 'HAS', passo, bloqueante: true })
      if (!hasKey(m, 'prevent_score') && !hasKey(m, 'prevent_calculado'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Calcular escore PREVENT',
          descricao: 'Risco cardiovascular AHA/ACC 2023 — obrigatório para decisão terapêutica.',
          prazo_dias: 7, protocolo: 'HAS', passo, bloqueante: true })
      break

    case 3:
      if (!hasKey(m, 'medicacao_iniciada') && !hasKey(m, 'mev_prescrita'))
        p.push({ tipo: 'medicacao', prioridade: 'urgente', titulo: 'Iniciar MEV + farmacoterapia',
          descricao: 'IECA ou BRA como 1ª linha. MEV obrigatória em todos os graus.',
          prazo_dias: 0, protocolo: 'HAS', passo, bloqueante: true })
      if (!hasKey(m, 'retorno_em_dias') && !hasKey(m, 'data_proximo_retorno'))
        p.push({ tipo: 'consulta', prioridade: 'media', titulo: 'Agendar retorno',
          descricao: '30 dias para HAS descontrolada; 45 para parcial.',
          prazo_dias: 3, protocolo: 'HAS', passo, bloqueante: false })
      break

    case 4:
      if (!hasExame(exames, 'ECG', 365))
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: 'Solicitar ECG',
          descricao: 'Rastreio de HVE — lesão de órgão-alvo.',
          prazo_dias: 30, protocolo: 'HAS', passo, bloqueante: true })
      if (!hasExame(exames, 'microalbuminuria', 365) && !hasExame(exames, 'Microalbuminúria', 365))
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: 'Solicitar microalbuminúria',
          descricao: 'Marcador precoce de nefropatia hipertensiva.',
          prazo_dias: 30, protocolo: 'HAS', passo, bloqueante: true })
      if (!hasExame(exames, 'Creatinina', 365))
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: 'Solicitar creatinina + TFG',
          descricao: 'Avaliar função renal como LOA.',
          prazo_dias: 30, protocolo: 'HAS', passo, bloqueante: false })
      break

    case 5:
      if (!paControlada2x(consultas))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'PA < 130/80 em 2 consultas consecutivas',
          descricao: 'Meta terapêutica confirmada em dois retornos seguidos.',
          prazo_dias: 45, protocolo: 'HAS', passo, bloqueante: true })
      break
  }
  return p
}

function criteriosDM(passo: number, m: Record<string, any>, consultas: any[], exames: any[]): AcaoPendente[] {
  const p: AcaoPendente[] = []

  switch (passo) {
    case 1:
      if (!hasExame(exames, 'HbA1c', 180) && !hasKey(m, 'hba1c'))
        p.push({ tipo: 'exame', prioridade: 'urgente', titulo: 'Coletar HbA1c',
          descricao: 'Principal marcador de controle glicêmico — confirmar DM e estadiar.',
          prazo_dias: 7, protocolo: 'DM', passo, bloqueante: true })
      if (!hasExame(exames, 'Glicemia', 90) && !hasKey(m, 'glicemia_jejum'))
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: 'Coletar glicemia de jejum',
          descricao: 'Confirmar diagnóstico: GJ ≥ 126 mg/dL em 2 ocasiões.',
          prazo_dias: 7, protocolo: 'DM', passo, bloqueante: true })
      break

    case 2:
      if (!hasKey(m, 'pe_diabetico_avaliado') && !hasExame(exames, 'Pé diabético', 365))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Avaliar pé diabético',
          descricao: 'Exame clínico: sensibilidade (monofilamento), pulsos, deformidades e lesões.',
          prazo_dias: 14, protocolo: 'DM', passo, bloqueante: true })
      if (!hasExame(exames, 'TFG', 365) && !hasExame(exames, 'Creatinina', 365))
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: 'Solicitar TFG / creatinina',
          descricao: 'Rastreio de nefropatia diabética.',
          prazo_dias: 30, protocolo: 'DM', passo, bloqueante: false })
      if (!hasKey(m, 'fundoscopia_solicitada') && !hasExame(exames, 'Fundoscopia', 365))
        p.push({ tipo: 'encaminhamento', prioridade: 'media', titulo: 'Solicitar fundoscopia',
          descricao: 'Rastreio de retinopatia diabética — encaminhar oftalmologia.',
          prazo_dias: 30, protocolo: 'DM', passo, bloqueante: false })
      break

    case 3:
      if (!hasKey(m, 'metformina_iniciada') && !hasKey(m, 'farmacoterapia_dm'))
        p.push({ tipo: 'medicacao', prioridade: 'urgente', titulo: 'Iniciar Metformina (ou justificar CI)',
          descricao: 'Metformina 500–1000mg como 1ª linha. Ajustar conforme TFG.',
          prazo_dias: 0, protocolo: 'DM', passo, bloqueante: true })
      if (!hasKey(m, 'retorno_em_dias') && !hasKey(m, 'data_proximo_retorno'))
        p.push({ tipo: 'consulta', prioridade: 'media', titulo: 'Agendar retorno em 90 dias',
          descricao: 'HbA1c e avaliação da resposta ao tratamento.',
          prazo_dias: 3, protocolo: 'DM', passo, bloqueante: false })
      break

    case 4:
      if (!hba1cControlada2x(exames))
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: 'HbA1c < 7% em 2 medidas consecutivas',
          descricao: 'Coletar a cada 3 meses até atingir meta. Escalonar tratamento se necessário.',
          prazo_dias: 90, protocolo: 'DM', passo, bloqueante: true })
      break

    case 5:
      if (!hasExame(exames, 'HbA1c', 180))
        p.push({ tipo: 'exame', prioridade: 'media', titulo: 'HbA1c semestral',
          descricao: 'Manter controle com coleta a cada 6 meses em meta estável.',
          prazo_dias: 30, protocolo: 'DM', passo, bloqueante: false })
      break
  }
  return p
}

function criteriosTAB(passo: number, m: Record<string, any>, consultas: any[], exames: any[]): AcaoPendente[] {
  const p: AcaoPendente[] = []

  switch (passo) {
    case 1:
      if (!hasKey(m, 'fagerstrom_score') && !hasKey(m, 'fagerstrom'))
        p.push({ tipo: 'escala', prioridade: 'alta', titulo: 'Aplicar Fagerström',
          descricao: 'Dependência à nicotina 0–10. Define intensidade da farmacoterapia.',
          prazo_dias: 0, protocolo: 'TAB', passo, bloqueante: true })
      if (!hasKey(m, 'macos_ano') && !hasKey(m, 'tabagismo_macos_ano'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Documentar maços-ano',
          descricao: '(maços/dia × anos fumados). Necessário para estratificação de risco pulmonar.',
          prazo_dias: 0, protocolo: 'TAB', passo, bloqueante: true })
      break

    case 2:
      if (!hasKey(m, 'estagio_motivacional') && !hasKey(m, 'motivacao_cessacao'))
        p.push({ tipo: 'escala', prioridade: 'alta', titulo: 'Avaliar estágio motivacional',
          descricao: 'Identificar: pré-contemplação, contemplação, preparação, ação ou manutenção.',
          prazo_dias: 7, protocolo: 'TAB', passo, bloqueante: true })
      if (!hasKey(m, 'aconselhamento_cessacao') && !hasKey(m, 'aconselhamento_feito'))
        p.push({ tipo: 'consulta', prioridade: 'media', titulo: 'Aconselhamento estruturado (5As)',
          descricao: 'Ask, Assess, Advise, Assist, Arrange — orientar sobre riscos e benefícios.',
          prazo_dias: 7, protocolo: 'TAB', passo, bloqueante: true })
      break

    case 3:
      if (!hasKey(m, 'data_d_cessacao') && !hasKey(m, 'data_parar'))
        p.push({ tipo: 'consulta', prioridade: 'urgente', titulo: 'Definir "Data D" de cessação',
          descricao: 'Data firme para parar de fumar — preferencialmente nos próximos 7–14 dias.',
          prazo_dias: 7, protocolo: 'TAB', passo, bloqueante: true })
      if (!hasKey(m, 'trn_prescrita') && !hasKey(m, 'bupropiona_prescrita') && !hasKey(m, 'vareniclina_prescrita'))
        p.push({ tipo: 'medicacao', prioridade: 'urgente', titulo: 'Prescrever farmacoterapia de cessação',
          descricao: 'TRN (adesivo 21mg + pastilha) + Bupropiona 150mg ou Vareniclina.',
          prazo_dias: 7, protocolo: 'TAB', passo, bloqueante: true })
      break

    case 4:
      if (!hasKey(m, 'seguimento_d30') && !hasKey(m, 'retorno_d30'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Seguimento D+1, D+7 e D+30',
          descricao: 'Contato no 1º dia (tel/WA), consulta na 1ª semana e no 1º mês após Data D.',
          prazo_dias: 30, protocolo: 'TAB', passo, bloqueante: true })
      break

    case 5: {
      const dias = num(m, 'cessacao_dias') ?? num(m, 'dias_abstinencia') ?? 0
      if (dias < 180)
        p.push({ tipo: 'consulta', prioridade: 'media', titulo: `Confirmar 180 dias sem fumar (${dias}d)`,
          descricao: 'Meta de cessação tabágica. Monitorar recaída por 1 ano.',
          prazo_dias: Math.max(0, 180 - dias), protocolo: 'TAB', passo, bloqueante: true })
      break
    }
  }
  return p
}

function criteriosTAG(passo: number, m: Record<string, any>, consultas: any[], exames: any[]): AcaoPendente[] {
  const p: AcaoPendente[] = []

  switch (passo) {
    case 1:
      if (!hasKey(m, 'gad7_score') && !hasKey(m, 'gad7'))
        p.push({ tipo: 'escala', prioridade: 'urgente', titulo: 'Aplicar GAD-7',
          descricao: '7 itens para triagem e quantificação da ansiedade generalizada (0–21).',
          prazo_dias: 0, protocolo: 'TAG', passo, bloqueante: true })
      break

    case 2:
      if (!hasExame(exames, 'TSH', 365))
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: 'Solicitar TSH',
          descricao: 'Excluir hipotireoidismo como causa orgânica de ansiedade.',
          prazo_dias: 14, protocolo: 'TAG', passo, bloqueante: true })
      if (!hasExame(exames, 'ECG', 365))
        p.push({ tipo: 'exame', prioridade: 'media', titulo: 'Solicitar ECG',
          descricao: 'Excluir arritmias que cursam com ansiedade / palpitações.',
          prazo_dias: 30, protocolo: 'TAG', passo, bloqueante: false })
      break

    case 3:
      if (!hasKey(m, 'isrs_prescrito') && !hasKey(m, 'tcc_encaminhada'))
        p.push({ tipo: 'medicacao', prioridade: 'urgente', titulo: 'Iniciar ISRS e/ou encaminhar TCC',
          descricao: 'Escitalopram 10–20mg ou Sertralina 50–100mg. TCC tem evidência equivalente.',
          prazo_dias: 7, protocolo: 'TAG', passo, bloqueante: true })
      break

    case 4: {
      const n = contarConsultasComMetrica(consultas, 'gad7_score', 90)
      if (n < 3)
        p.push({ tipo: 'escala', prioridade: 'alta', titulo: `GAD-7 mensal — ${n}/3 meses`,
          descricao: 'Reaplicar GAD-7 a cada mês para avaliar resposta ao tratamento.',
          prazo_dias: 30, protocolo: 'TAG', passo, bloqueante: true })
      break
    }

    case 5: {
      const gad7 = num(m, 'gad7_score') ?? num(m, 'gad7')
      if (gad7 === undefined || gad7 >= 5)
        p.push({ tipo: 'escala', prioridade: 'alta',
          titulo: `GAD-7 < 5 em 2 medidas consecutivas (atual: ${gad7 ?? 'não registrado'})`,
          descricao: 'Meta de remissão. Manter farmacoterapia por ≥ 1 ano.',
          prazo_dias: 30, protocolo: 'TAG', passo, bloqueante: true })
      break
    }
  }
  return p
}

function criteriosCHK(passo: number, m: Record<string, any>, consultas: any[], exames: any[]): AcaoPendente[] {
  const p: AcaoPendente[] = []

  switch (passo) {
    case 1:
      if (!hasKey(m, 'pa_sistolica') || !hasKey(m, 'peso') || !hasKey(m, 'altura'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Registrar vitais e antropometria',
          descricao: 'PA, FC, SpO₂, temperatura, peso, altura e circunferência abdominal.',
          prazo_dias: 0, protocolo: 'CHK', passo, bloqueante: true })
      if (!hasKey(m, 'phq2_score') && !hasKey(m, 'phq9_score'))
        p.push({ tipo: 'escala', prioridade: 'media', titulo: 'Aplicar PHQ-2',
          descricao: 'Triagem de depressão. Se score ≥ 3 → prosseguir para PHQ-9.',
          prazo_dias: 0, protocolo: 'CHK', passo, bloqueante: false })
      if (!hasKey(m, 'audit_c_score'))
        p.push({ tipo: 'escala', prioridade: 'media', titulo: 'Aplicar AUDIT-C',
          descricao: 'Triagem de uso de risco de álcool (3 itens).',
          prazo_dias: 0, protocolo: 'CHK', passo, bloqueante: false })
      break

    case 2:
      if (!hasKey(m, 'rastreamentos_oncologicos_verificados'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Verificar rastreamentos oncológicos',
          descricao: 'DNA-HPV (mulheres 25–64a), mamografia (≥40a), FIT (≥45a) conforme sexo e faixa etária.',
          prazo_dias: 30, protocolo: 'CHK', passo, bloqueante: true })
      break

    case 3:
      if (!hasKey(m, 'prevent_calculado') && !hasKey(m, 'prevent_score'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Calcular escore PREVENT',
          descricao: 'Risco CV 10 anos — define indicação de estatina e aspirina.',
          prazo_dias: 14, protocolo: 'CHK', passo, bloqueante: true })
      if (!hasExame(exames, 'Lipidograma', 365) && !hasExame(exames, 'LDL', 365))
        p.push({ tipo: 'exame', prioridade: 'media', titulo: 'Solicitar lipidograma completo',
          descricao: 'Rastreio de dislipidemia e insumo para PREVENT.',
          prazo_dias: 30, protocolo: 'CHK', passo, bloqueante: false })
      if (!hasExame(exames, 'Glicemia', 365))
        p.push({ tipo: 'exame', prioridade: 'media', titulo: 'Solicitar glicemia de jejum',
          descricao: 'Rastreio de pré-DM e DM.',
          prazo_dias: 30, protocolo: 'CHK', passo, bloqueante: false })
      break

    case 4:
      if (!hasKey(m, 'vacinacao_verificada'))
        p.push({ tipo: 'vacina', prioridade: 'media', titulo: 'Verificar e atualizar vacinação',
          descricao: 'Influenza anual, dTpa, COVID-19 atualizado, PCV20. Registrar pendentes.',
          prazo_dias: 30, protocolo: 'CHK', passo, bloqueante: true })
      break

    case 5:
      if (!hasKey(m, 'todos_rastreamentos_em_dia'))
        p.push({ tipo: 'consulta', prioridade: 'baixa', titulo: 'Confirmar todos rastreamentos em dia',
          descricao: 'Registrar datas dos próximos rastreamentos e agendar retorno anual.',
          prazo_dias: 60, protocolo: 'CHK', passo, bloqueante: false })
      break
  }
  return p
}

function criteriosGOT(passo: number, m: Record<string, any>, consultas: any[], exames: any[]): AcaoPendente[] {
  const p: AcaoPendente[] = []

  switch (passo) {
    case 1:
      if (!hasExame(exames, 'úrico', 30) && !hasExame(exames, 'urico', 30) && !hasKey(m, 'acido_urico'))
        p.push({ tipo: 'exame', prioridade: 'urgente', titulo: 'Coletar ácido úrico sérico',
          descricao: 'Dosar na crise ou até 2 semanas após. Confirmar hiperuricemia.',
          prazo_dias: 7, protocolo: 'GOT', passo, bloqueante: true })
      if (!hasExame(exames, 'Creatinina', 90))
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: 'Coletar creatinina + TFG',
          descricao: 'DRC é contraindicação relativa ao alopurinol em doses plenas.',
          prazo_dias: 14, protocolo: 'GOT', passo, bloqueante: false })
      break

    case 2:
      if (!hasKey(m, 'colchicina_prescrita') && !hasKey(m, 'aine_prescrito') && !hasKey(m, 'corticoide_prescrito'))
        p.push({ tipo: 'medicacao', prioridade: 'urgente', titulo: 'Tratar crise aguda de gota',
          descricao: 'Colchicina 0,5mg 3×/dia por 7 dias é 1ª linha. Alt: naproxeno ou prednisona.',
          prazo_dias: 0, protocolo: 'GOT', passo, bloqueante: true })
      break

    case 3:
      if (!hasKey(m, 'indicacao_alopurinol_avaliada'))
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: 'Avaliar e documentar indicação de alopurinol',
          descricao: 'Indicar se ≥ 2 crises/ano, tofos, urolitíase ou DRC associada.',
          prazo_dias: 30, protocolo: 'GOT', passo, bloqueante: true })
      break

    case 4: {
      const au = num(m, 'acido_urico')
      if (!hasKey(m, 'alopurinol_prescrito'))
        p.push({ tipo: 'medicacao', prioridade: 'alta', titulo: 'Prescrever e titular alopurinol',
          descricao: 'Iniciar 100mg/dia, aumentar 100mg a cada 2–4 semanas até AU < 6,0.',
          prazo_dias: 7, protocolo: 'GOT', passo, bloqueante: true })
      else if (au !== undefined && au >= 6.0)
        p.push({ tipo: 'exame', prioridade: 'alta', titulo: `AU = ${au} mg/dL — aumentar dose`,
          descricao: 'Meta: ácido úrico < 6,0 mg/dL. Titular alopurinol.',
          prazo_dias: 60, protocolo: 'GOT', passo, bloqueante: true })
      break
    }

    case 5: {
      const au = num(m, 'acido_urico')
      if (au === undefined || au >= 6.0)
        p.push({ tipo: 'exame', prioridade: 'media',
          titulo: `Confirmar AU < 6,0 mg/dL em 2 dosagens (atual: ${au ?? 'não dosado'})`,
          descricao: 'Dosar a cada 6 meses em dose estável.',
          prazo_dias: 60, protocolo: 'GOT', passo, bloqueante: false })
      break
    }
  }
  return p
}

function criteriosALC(passo: number, m: Record<string, any>, consultas: any[], exames: any[]): AcaoPendente[] {
  const p: AcaoPendente[] = []

  switch (passo) {
    case 1:
      if (!hasKey(m, 'audit_c_score') && !hasKey(m, 'audit_score'))
        p.push({ tipo: 'escala', prioridade: 'urgente', titulo: 'Aplicar AUDIT-C',
          descricao: 'Triagem de uso de risco. Se positivo (≥3F / ≥4M) → AUDIT completo.',
          prazo_dias: 0, protocolo: 'ALC', passo, bloqueante: true })
      break

    case 2:
      if (!hasKey(m, 'tua_dsm5_criterios') && !hasKey(m, 'diagnostico_tua'))
        p.push({ tipo: 'consulta', prioridade: 'urgente', titulo: 'Documentar diagnóstico TUA (DSM-5-TR)',
          descricao: 'Registrar nº critérios: leve 2–3, moderado 4–5, grave ≥ 6.',
          prazo_dias: 7, protocolo: 'ALC', passo, bloqueante: true })
      break

    case 3:
      if (!hasKey(m, 'intervencao_breve_realizada') && !hasKey(m, 'farmacoterapia_alc'))
        p.push({ tipo: 'consulta', prioridade: 'urgente', titulo: 'Realizar Intervenção Breve estruturada',
          descricao: 'FRAMES: Feedback, Responsabilidade, Aconselhamento, Menu, Empatia, Autoeficácia.',
          prazo_dias: 0, protocolo: 'ALC', passo, bloqueante: true })
      if (!hasKey(m, 'tiamina_prescrita'))
        p.push({ tipo: 'medicacao', prioridade: 'urgente', titulo: 'Prescrever Tiamina OBRIGATÓRIO',
          descricao: '300mg IM 1× ou 100mg VO 3×/dia — previne encefalopatia de Wernicke.',
          prazo_dias: 0, protocolo: 'ALC', passo, bloqueante: true })
      if (!hasKey(m, 'caps_encaminhado'))
        p.push({ tipo: 'encaminhamento', prioridade: 'alta', titulo: 'Encaminhar para CAPS-AD',
          descricao: 'Tratamento especializado em álcool e outras drogas.',
          prazo_dias: 14, protocolo: 'ALC', passo, bloqueante: false })
      break

    case 4: {
      const n = contarConsultasComMetrica(consultas, 'audit_score', 90)
      if (n < 3)
        p.push({ tipo: 'consulta', prioridade: 'alta', titulo: `Seguimento mensal — ${n}/3 realizados`,
          descricao: 'Aplicar AUDIT e avaliar abstinência a cada mês por 3 meses consecutivos.',
          prazo_dias: 30, protocolo: 'ALC', passo, bloqueante: true })
      break
    }

    case 5: {
      const audit = num(m, 'audit_score') ?? num(m, 'audit')
      const abstDias = num(m, 'abstinencia_dias') ?? 0
      if (abstDias < 180 && (audit === undefined || audit >= 8))
        p.push({ tipo: 'escala', prioridade: 'media',
          titulo: `AUDIT < 8 ou abstinência ≥ 180d (atual: AUDIT ${audit ?? 'N/A'} | ${abstDias}d)`,
          descricao: 'Confirmar remissão sustentada. Manter seguimento semestral.',
          prazo_dias: 30, protocolo: 'ALC', passo, bloqueante: false })
      break
    }
  }
  return p
}

function criteriosGenerico(
  protocolo: string,
  passo: number,
  m: Record<string, any>,
  consultas: any[],
  exames: any[]
): AcaoPendente[] {
  if (bool(m, `passo_${passo}_completo`)) return []

  const proto = PROTOCOLO_MAP.get(protocolo)
  if (!proto) return []

  const passoInfo = proto.passos_fluxo.find(pp => pp.numero === passo)
  if (!passoInfo) return []

  if (passo === 5) {
    const controle = calcularStatusControle(protocolo, m)
    if (controle === 'controlado') return []
    return [{
      tipo: 'consulta', prioridade: 'media',
      titulo: `Meta ainda não atingida — ${passoInfo.titulo}`,
      descricao: passoInfo.descricao,
      prazo_dias: proto.retorno_dias.descontrolado,
      protocolo, passo, bloqueante: false,
    }]
  }

  return [{
    tipo: 'consulta',
    prioridade: passo <= 2 ? 'alta' : 'media',
    titulo: passoInfo.titulo,
    descricao: passoInfo.descricao,
    prazo_dias: (DURACAO_PASSO[protocolo] ?? [])[passo - 1] ?? 30,
    protocolo, passo,
    bloqueante: passo <= 2,
  }]
}

function getCriterios(
  protocolo: string,
  passo: number,
  m: Record<string, any>,
  consultas: any[],
  exames: any[]
): AcaoPendente[] {
  switch (protocolo) {
    case 'HAS': return criteriosHAS(passo, m, consultas, exames)
    case 'DM':  return criteriosDM(passo, m, consultas, exames)
    case 'TAB': return criteriosTAB(passo, m, consultas, exames)
    case 'TAG': return criteriosTAG(passo, m, consultas, exames)
    case 'CHK': return criteriosCHK(passo, m, consultas, exames)
    case 'GOT': return criteriosGOT(passo, m, consultas, exames)
    case 'ALC': return criteriosALC(passo, m, consultas, exames)
    default:    return criteriosGenerico(protocolo, passo, m, consultas, exames)
  }
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export async function calcularJornada(
  paciente_id: string,
  protocolo: string,
  metricas: Record<string, any>,
  historico_consultas: any[],
  historico_exames: any[]
): Promise<StatusJornada> {
  const proto = PROTOCOLO_MAP.get(protocolo)
  const totalPassos = proto?.passos_fluxo.length ?? 5

  const passoAtual = Math.max(1, Math.min(totalPassos, Number(metricas.passo_protocolo ?? 1)))
  const passoInfo = proto?.passos_fluxo.find(p => p.numero === passoAtual)
  const proximoInfo = proto?.passos_fluxo.find(p => p.numero === passoAtual + 1)

  const acoesPendentes = getCriterios(protocolo, passoAtual, metricas, historico_consultas, historico_exames)

  const acoesConcluidas: string[] = []
  for (let pp = 1; pp < passoAtual; pp++) {
    const info = proto?.passos_fluxo.find(s => s.numero === pp)
    if (info) acoesConcluidas.push(info.titulo)
  }

  const diasPasso = diasNoPasso(historico_consultas, passoAtual)
  const duracaoEsperada = (DURACAO_PASSO[protocolo] ?? [])[passoAtual - 1] ?? 30
  const alerta = diasPasso > 0 && diasPasso > duracaoEsperada * 2

  const consultaEntrada = historico_consultas
    .filter(c => Number(c.passo_protocolo) === passoAtual)
    .sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime())[0]

  let dataPrevistaAvanco: Date | null = null
  if (consultaEntrada) {
    dataPrevistaAvanco = new Date(consultaEntrada.data_consulta)
    dataPrevistaAvanco.setDate(dataPrevistaAvanco.getDate() + duracaoEsperada)
  }

  return {
    paciente_id,
    protocolo,
    passo_atual: passoAtual,
    titulo_passo: passoInfo?.titulo ?? `Passo ${passoAtual}`,
    percentual_conclusao: Math.round(((passoAtual - 1) / totalPassos) * 100),
    acoes_pendentes: acoesPendentes,
    acoes_concluidas: acoesConcluidas,
    proximo_passo: proximoInfo?.titulo ?? 'Meta atingida ✓',
    status_controle: calcularStatusControle(protocolo, metricas),
    data_prevista_avanco: dataPrevistaAvanco,
    dias_no_passo_atual: diasPasso,
    alerta_estagnacao: alerta,
  }
}

// avancarPasso foi movido para lib/jornada/actions.ts (server action)
// para evitar importação de next/headers em client components.
