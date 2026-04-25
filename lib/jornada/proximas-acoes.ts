import type { Paciente, Consulta } from '@/types'
import type { StatusJornada } from './motor'

// ─── Public interface ─────────────────────────────────────────────────────────

export interface ProximaAcao {
  paciente_id: string
  paciente_nome: string
  protocolo: string
  acao: string
  motivo: string
  prazo: 'hoje' | 'essa_semana' | 'esse_mes' | 'proximo_mes'
  urgencia: 1 | 2 | 3 | 4 | 5
  tipo_contato: 'consulta_presencial' | 'telefonema' | 'whatsapp' | 'email'
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function prazoFromDias(dias: number): ProximaAcao['prazo'] {
  if (dias <= 0) return 'hoje'
  if (dias <= 7) return 'essa_semana'
  if (dias <= 30) return 'esse_mes'
  return 'proximo_mes'
}

function tipoContato(urgencia: ProximaAcao['urgencia']): ProximaAcao['tipo_contato'] {
  if (urgencia >= 5) return 'telefonema'
  if (urgencia >= 4) return 'consulta_presencial'
  if (urgencia >= 3) return 'whatsapp'
  return 'email'
}

function clamp(n: number): ProximaAcao['urgencia'] {
  return Math.max(1, Math.min(5, n)) as ProximaAcao['urgencia']
}

// ─── Input type ───────────────────────────────────────────────────────────────

export interface PacienteComJornadas {
  paciente: Pick<Paciente, 'id' | 'nome'>
  jornadas: StatusJornada[]
  metricas: Record<string, any>
  ultima_consulta?: Pick<Consulta, 'data_consulta'> | null
  dias_sem_retorno: number
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function gerarProximasAcoes(pacientes: PacienteComJornadas[]): ProximaAcao[] {
  const acoes: ProximaAcao[] = []

  for (const { paciente, jornadas, metricas: m, dias_sem_retorno } of pacientes) {
    const nome = paciente.nome

    // ── Urgência 5: condições críticas por métricas ───────────────────────────

    const paS = Number(m.pa_sistolica ?? 0)
    const paD = Number(m.pa_diastolica ?? 0)
    if (paS > 180 || paD > 110) {
      acoes.push({
        paciente_id: paciente.id, paciente_nome: nome,
        protocolo: 'HAS',
        acao: 'Avaliação imediata de crise hipertensiva',
        motivo: `PA registrada em ${paS}/${paD} mmHg — crise hipertensiva`,
        prazo: 'hoje', urgencia: 5, tipo_contato: 'telefonema',
      })
    }

    const hba1c = Number(m.hba1c ?? 0)
    if (hba1c > 10) {
      acoes.push({
        paciente_id: paciente.id, paciente_nome: nome,
        protocolo: 'DM',
        acao: 'Reavaliação urgente — DM descompensado',
        motivo: `HbA1c = ${hba1c}% — muito acima da meta de 7%`,
        prazo: 'essa_semana', urgencia: 5, tipo_contato: 'consulta_presencial',
      })
    }

    const phq9item9 = Number(m.phq9_item9 ?? 0)
    if (phq9item9 > 0) {
      acoes.push({
        paciente_id: paciente.id, paciente_nome: nome,
        protocolo: 'SM',
        acao: 'Avaliação de risco de suicídio — URGENTE',
        motivo: `PHQ-9 item 9 = ${phq9item9} — presença de ideação suicida`,
        prazo: 'hoje', urgencia: 5, tipo_contato: 'telefonema',
      })
    }

    const abstDias = Number(m.abstinencia_dias ?? -1)
    if (m.diagnostico_tua && abstDias >= 0 && abstDias < 3) {
      acoes.push({
        paciente_id: paciente.id, paciente_nome: nome,
        protocolo: 'ALC',
        acao: 'Acompanhar síndrome de abstinência alcoólica',
        motivo: `TUA diagnosticado — abstinência < 3 dias (risco de síndrome grave)`,
        prazo: 'hoje', urgencia: 5, tipo_contato: 'telefonema',
      })
    }

    // ── Por jornada ───────────────────────────────────────────────────────────

    for (const jornada of jornadas) {
      // Urgência 4: retorno vencido > 60 dias em protocolo descontrolado
      if (dias_sem_retorno > 60 && jornada.status_controle === 'descontrolado') {
        acoes.push({
          paciente_id: paciente.id, paciente_nome: nome,
          protocolo: jornada.protocolo,
          acao: 'Retorno urgente — protocolo descontrolado',
          motivo: `${dias_sem_retorno} dias sem consulta em ${jornada.protocolo} descontrolado`,
          prazo: 'essa_semana', urgencia: 4, tipo_contato: 'consulta_presencial',
        })
        continue
      }

      // Urgência 3: retorno vencido 30–60 dias em descontrolado ou estagnação
      if (dias_sem_retorno > 30 && jornada.status_controle === 'descontrolado') {
        acoes.push({
          paciente_id: paciente.id, paciente_nome: nome,
          protocolo: jornada.protocolo,
          acao: 'Agendar retorno',
          motivo: `${dias_sem_retorno} dias sem retorno em ${jornada.protocolo}`,
          prazo: 'esse_mes', urgencia: 3, tipo_contato: 'whatsapp',
        })
      }

      if (jornada.alerta_estagnacao) {
        acoes.push({
          paciente_id: paciente.id, paciente_nome: nome,
          protocolo: jornada.protocolo,
          acao: `Paciente estagnado no passo ${jornada.passo_atual} — "${jornada.titulo_passo}"`,
          motivo: `${jornada.dias_no_passo_atual} dias no mesmo passo (> 2× tempo esperado)`,
          prazo: 'esse_mes', urgencia: 3, tipo_contato: 'whatsapp',
        })
      }

      // Ações pendentes da jornada
      for (const acao of jornada.acoes_pendentes) {
        let urg: number =
          acao.prioridade === 'urgente' ? 4
          : acao.prioridade === 'alta'   ? 3
          : acao.prioridade === 'media'  ? 2
          : 1

        // Upgrade se bloqueante e estagnado
        if (acao.bloqueante && jornada.alerta_estagnacao) urg = Math.min(5, urg + 1)

        // Urgência 2 para retorno vencido < 30 dias em parcial
        if (dias_sem_retorno > 0 && dias_sem_retorno <= 30 && jornada.status_controle !== 'controlado') {
          urg = Math.max(urg, 2)
        }

        const urgencia = clamp(urg)

        acoes.push({
          paciente_id: paciente.id,
          paciente_nome: nome,
          protocolo: jornada.protocolo,
          acao: acao.titulo,
          motivo: acao.descricao,
          prazo: prazoFromDias(acao.prazo_dias),
          urgencia,
          tipo_contato: tipoContato(urgencia),
        })
      }

      // Urgência 1: próximo passo não iniciado em controlado
      if (jornada.acoes_pendentes.length === 0 && jornada.passo_atual < 5) {
        acoes.push({
          paciente_id: paciente.id, paciente_nome: nome,
          protocolo: jornada.protocolo,
          acao: `Avançar para passo ${jornada.passo_atual + 1} — "${jornada.proximo_passo}"`,
          motivo: `Todos os critérios do passo ${jornada.passo_atual} foram cumpridos`,
          prazo: 'esse_mes', urgencia: 1, tipo_contato: 'email',
        })
      }
    }
  }

  // Ordenar: urgência desc, depois prazo asc
  const prazoOrder: Record<string, number> = { hoje: 0, essa_semana: 1, esse_mes: 2, proximo_mes: 3 }
  return acoes.sort((a, b) => {
    if (b.urgencia !== a.urgencia) return b.urgencia - a.urgencia
    return prazoOrder[a.prazo] - prazoOrder[b.prazo]
  })
}

// ─── Helper: badge visual ─────────────────────────────────────────────────────

export function urgenciaBadge(urgencia: ProximaAcao['urgencia']): { label: string; className: string } {
  switch (urgencia) {
    case 5: return { label: 'Crítico',   className: 'bg-red-100 text-red-700 border-red-200' }
    case 4: return { label: 'Urgente',   className: 'bg-orange-100 text-orange-700 border-orange-200' }
    case 3: return { label: 'Alto',      className: 'bg-amber-100 text-amber-700 border-amber-200' }
    case 2: return { label: 'Médio',     className: 'bg-blue-100 text-blue-700 border-blue-200' }
    default: return { label: 'Baixo',   className: 'bg-slate-100 text-slate-600 border-slate-200' }
  }
}

export function prazoBadge(prazo: ProximaAcao['prazo']): { label: string; className: string } {
  switch (prazo) {
    case 'hoje':        return { label: 'Hoje',         className: 'text-red-600 font-semibold' }
    case 'essa_semana': return { label: 'Esta semana',  className: 'text-orange-600 font-medium' }
    case 'esse_mes':    return { label: 'Este mês',     className: 'text-blue-600' }
    default:            return { label: 'Próx. mês',    className: 'text-slate-500' }
  }
}

export function contatoIcon(tipo: ProximaAcao['tipo_contato']): string {
  switch (tipo) {
    case 'telefonema':          return '📞'
    case 'consulta_presencial': return '🏥'
    case 'whatsapp':            return '💬'
    case 'email':               return '📧'
  }
}
