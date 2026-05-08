// Mapeia o tipo de uma AcaoPendente do motor de jornadas para a rota
// que o profissional precisa abrir para concluir a pendência.
//
// Mantém o título da ação como hint para que páginas downstream possam
// destacar o campo a preencher.

import type { AcaoPendente } from '@/lib/jornada/motor'

export interface AcaoDestino {
  href: string
  /** Texto curto que aparece como CTA no item ("Atender →", "Aplicar escala →"). */
  cta: string
}

/**
 * Resolve a rota para resolver uma ação pendente.
 *
 * Estratégia:
 * - consulta / medicação / encaminhamento / vacina → abrir consulta
 *   (todos esses dados são registrados durante o atendimento)
 * - exame → aba de exames do paciente (registrar resultado)
 * - escala → aba de escalas (aplicar PROM)
 */
export function resolverAcao(pacienteId: string, acao: AcaoPendente): AcaoDestino {
  const ctxParams = new URLSearchParams({
    protocolo: acao.protocolo,
    foco: acao.titulo.slice(0, 80),
  })

  switch (acao.tipo) {
    case 'consulta':
      return {
        href: `/pacientes/${pacienteId}/consulta?${ctxParams.toString()}`,
        cta: 'Atender →',
      }
    case 'medicacao':
      return {
        href: `/pacientes/${pacienteId}/consulta?${ctxParams.toString()}`,
        cta: 'Prescrever →',
      }
    case 'encaminhamento':
      return {
        href: `/pacientes/${pacienteId}/consulta?${ctxParams.toString()}`,
        cta: 'Encaminhar →',
      }
    case 'vacina':
      return {
        href: `/pacientes/${pacienteId}/consulta?${ctxParams.toString()}`,
        cta: 'Registrar vacina →',
      }
    case 'exame':
      return {
        href: `/pacientes/${pacienteId}?tab=exames&protocolo=${acao.protocolo}`,
        cta: 'Registrar exame →',
      }
    case 'escala':
      return {
        href: `/pacientes/${pacienteId}?tab=escalas&protocolo=${acao.protocolo}`,
        cta: 'Aplicar escala →',
      }
    default:
      return {
        href: `/pacientes/${pacienteId}?tab=jornada`,
        cta: 'Resolver →',
      }
  }
}
