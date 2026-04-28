// MedAPS Pro — Avaliação de scores críticos para gerar alertas automáticos.
//
// Função pura: dado o código da escala, score e respostas, devolve o payload
// do alerta a inserir (ou null se não há criticidade). Usada tanto no fluxo
// presencial (HistoricoEscalas) quanto na rota pública (/escala/[token]).

import type { EscalaCodigo } from './ichom'
import type { PremCodigo, ResultadoPREM } from './prems'

export type TipoAlertaEscala =
  | 'phq9_critico'
  | 'risco_suicidio'
  | 'gad7_critico'
  | 'cat_critico'
  | 'audit_critico'
  | 'paciente_detrator'

export type PrioridadeAlertaDB = 'baixa' | 'media' | 'alta' | 'critica'

export interface AlertaPayload {
  /** Tipo conforme CHECK constraint da migração 003 */
  tipo: TipoAlertaEscala
  /** Mapeado para o CHECK constraint existente: urgente→alta, atencao→media, critica→critica */
  prioridade: PrioridadeAlertaDB
  /** Apresentação (compatível com Alerta UI) */
  prioridadeUI: 'urgente' | 'atencao' | 'critica'
  titulo: string
  descricao: string
  /** Código de protocolo associado (se houver) — preenchido pela camada chamadora */
  protocolo_codigo?: string
}

interface ResultadoBasico {
  score: number
  classificacao: string
  respostas: Record<string, number>
}

// ─── PROMs (ICHOM) ───────────────────────────────────────────────────────────

export function avaliarAlertaCriticoPROM(
  codigo: EscalaCodigo,
  resultado: ResultadoBasico,
): AlertaPayload | null {
  const { score, classificacao, respostas } = resultado

  // Risco de suicídio (PHQ-9 item 9 > 0) tem precedência sobre PHQ-9 score
  if (codigo === 'PHQ9') {
    const item9 = respostas['p9'] ?? 0
    if (item9 > 0) {
      return {
        tipo: 'risco_suicidio',
        prioridade: 'critica',
        prioridadeUI: 'critica',
        titulo: 'PHQ-9 — Risco de suicídio identificado',
        descricao:
          `Item 9 do PHQ-9 com pontuação ${item9}. Avaliação imediata da ideação suicida necessária. ` +
          `Score total: ${score} (${classificacao}). Não liberar paciente sem plano de segurança.`,
      }
    }
    if (score >= 15) {
      return {
        tipo: 'phq9_critico',
        prioridade: 'alta',
        prioridadeUI: 'urgente',
        titulo: `PHQ-9 ≥ 15 — ${classificacao}`,
        descricao:
          `Sintomas depressivos graves (PHQ-9 = ${score}). ` +
          `Indicar farmacoterapia + psicoterapia. Considerar encaminhamento ao psiquiatra.`,
      }
    }
    return null
  }

  if (codigo === 'GAD7' && score >= 15) {
    return {
      tipo: 'gad7_critico',
      prioridade: 'alta',
      prioridadeUI: 'urgente',
      titulo: `GAD-7 ≥ 15 — ${classificacao}`,
      descricao:
        `Ansiedade grave (GAD-7 = ${score}). Iniciar ISRS/ISRSN + TCC. ` +
        `Considerar encaminhamento ao psiquiatra.`,
    }
  }

  if (codigo === 'CAT' && score >= 30) {
    return {
      tipo: 'cat_critico',
      prioridade: 'alta',
      prioridadeUI: 'urgente',
      titulo: `CAT ≥ 30 — Impacto muito alto da DPOC`,
      descricao:
        `CAT = ${score}. Reavaliar adesão, técnica inalatória e necessidade de step-up terapêutico. ` +
        `Considerar reabilitação pulmonar.`,
    }
  }

  if (codigo === 'AUDIT' && score >= 20) {
    return {
      tipo: 'audit_critico',
      prioridade: 'alta',
      prioridadeUI: 'urgente',
      titulo: `AUDIT ≥ 20 — Provável dependência ao álcool`,
      descricao:
        `AUDIT = ${score}. Avaliação para diagnóstico de transtorno por uso de álcool. ` +
        `Considerar encaminhamento especializado e abordagem motivacional.`,
    }
  }

  return null
}

// ─── PREMs ───────────────────────────────────────────────────────────────────

export function avaliarAlertaCriticoPREM(
  codigo: PremCodigo,
  resultado: ResultadoPREM,
): AlertaPayload | null {
  if (codigo !== 'GLOBAL') return null
  const nps = resultado.nps_individual
  if (nps !== null && nps !== undefined && nps <= 6) {
    return {
      tipo: 'paciente_detrator',
      prioridade: 'media',
      prioridadeUI: 'atencao',
      titulo: `NPS ${nps} — Paciente detrator`,
      descricao:
        `Resposta de NPS = ${nps} (≤ 6) classifica como detrator. ` +
        `Realizar contato ativo para entender insatisfação e planejar correção.`,
    }
  }
  return null
}

// ─── Toast helper ────────────────────────────────────────────────────────────

export function tituloToastSucesso(
  pacienteNome: string,
  escalaNome: string,
  score: number,
  alerta: AlertaPayload | null,
): { titulo: string; descricao: string; tipo: 'sucesso' | 'aviso' | 'critico' } {
  const primeiroNome = pacienteNome.split(' ')[0]
  if (!alerta) {
    return {
      tipo: 'sucesso',
      titulo: `${primeiroNome} respondeu ${escalaNome}`,
      descricao: `Score ${score}. Sem critérios de alerta.`,
    }
  }
  const tipoToast = alerta.prioridade === 'critica' ? 'critico'
    : alerta.prioridade === 'alta' ? 'aviso'
    : 'aviso'
  const rotuloPrioridade =
    alerta.prioridade === 'critica' ? 'CRÍTICO'
    : alerta.prioridade === 'alta'  ? 'urgente'
    : 'atenção'
  return {
    tipo: tipoToast,
    titulo: `${primeiroNome} respondeu ${escalaNome} — Score ${score}`,
    descricao: `Alerta ${rotuloPrioridade} gerado: ${alerta.titulo}`,
  }
}
