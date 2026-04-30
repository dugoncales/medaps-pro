// Mapeia o tipo de um alerta para a página/aba que o profissional precisa
// abrir pra resolver o pendente. Centralizado aqui pra reuso entre /alertas,
// dashboard e qualquer outro consumidor.

import type { AlertaTipo } from '@/types'

export interface AlertaDestino {
  /** Aba inicial em /pacientes/[id] */
  tab: 'resumo' | 'jornada' | 'consultas' | 'evolucao' | 'escalas' | 'exames' | 'alertas'
  /** Se true, abre o AgendarConsultaModal automaticamente após o redirect */
  abrirAgendar?: boolean
  /** Texto do botão "Resolver →" pra dar contexto */
  rotuloAcao: string
}

const MAP: Record<AlertaTipo, AlertaDestino> = {
  retorno_vencido:   { tab: 'consultas', abrirAgendar: true,  rotuloAcao: 'Agendar retorno →' },
  exame_atrasado:    { tab: 'exames',                          rotuloAcao: 'Ver exames →' },
  meta_nao_atingida: { tab: 'jornada',                         rotuloAcao: 'Ver jornada →' },
  urgencia:          { tab: 'resumo',                          rotuloAcao: 'Atender →' },
  phq9_critico:      { tab: 'escalas',                         rotuloAcao: 'Revisar PHQ-9 →' },
  risco_suicidio:    { tab: 'escalas',                         rotuloAcao: 'Avaliar urgência →' },
  gad7_critico:      { tab: 'escalas',                         rotuloAcao: 'Revisar GAD-7 →' },
  cat_critico:       { tab: 'escalas',                         rotuloAcao: 'Revisar CAT →' },
  audit_critico:     { tab: 'escalas',                         rotuloAcao: 'Revisar AUDIT →' },
  paciente_detrator: { tab: 'resumo',                          rotuloAcao: 'Contatar paciente →' },
}

export function destinoParaAlerta(tipo: AlertaTipo): AlertaDestino {
  return MAP[tipo] ?? { tab: 'resumo', rotuloAcao: 'Abrir →' }
}

export function rotaParaAlerta(pacienteId: string, tipo: AlertaTipo): string {
  const dest = destinoParaAlerta(tipo)
  const params = new URLSearchParams({ tab: dest.tab })
  if (dest.abrirAgendar) params.set('agendar', '1')
  return `/pacientes/${pacienteId}?${params.toString()}`
}
