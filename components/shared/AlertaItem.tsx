import { cn } from '@/lib/utils'
import type { Alerta, AlertaTipo } from '@/types'
import { prioridadeToUI } from '@/types'

interface AlertaItemProps {
  alerta: Alerta
  /** Recebe o objeto inteiro pra permitir roteamento por tipo */
  onResolver?: (alerta: Alerta) => void
  compact?: boolean
  /** Texto do botão. Default: "Resolver" */
  resolverLabel?: string
}

const PRIORIDADE_STYLE = {
  urgente:     { borderL: '#DC2626', badge: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]', dot: 'bg-[#DC2626]' },
  atencao:     { borderL: '#D97706', badge: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]', dot: 'bg-[#D97706]' },
  informativo: { borderL: '#059669', badge: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]', dot: 'bg-[#059669]' },
}

const TIPO_LABEL: Record<AlertaTipo, string> = {
  retorno_vencido:   'Retorno vencido',
  exame_atrasado:    'Exame atrasado',
  meta_nao_atingida: 'Meta não atingida',
  urgencia:          'Urgência',
  phq9_critico:      'PHQ-9 crítico',
  risco_suicidio:    'Risco de suicídio',
  gad7_critico:      'GAD-7 crítico',
  cat_critico:       'CAT crítico',
  audit_critico:     'AUDIT crítico',
  paciente_detrator: 'NPS detrator',
}

export function AlertaItem({ alerta, onResolver, compact, resolverLabel }: AlertaItemProps) {
  const prioridade = prioridadeToUI(alerta.prioridade)
  const style = PRIORIDADE_STYLE[prioridade]
  const label = TIPO_LABEL[alerta.tipo] ?? 'Alerta'

  return (
    <div
      className="rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_2px_4px_-1px_rgba(0,0,0,0.05)]"
      style={{ borderLeft: `4px solid ${style.borderL}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className={cn('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', style.dot)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111827] leading-tight">{alerta.titulo}</p>
            {alerta.paciente && (
              <p className="text-xs text-[#6B7280] mt-0.5">
                {alerta.paciente?.nome ?? '—'}
                {alerta.paciente?.matricula ? ` · ${alerta.paciente.matricula}` : ''}
              </p>
            )}
            {!compact && alerta.descricao && (
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{alerta.descricao}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', style.badge)}>
            {label}
          </span>
          {alerta.dias_atraso > 0 && (
            <span className="text-[10px] text-[#9CA3AF] font-medium">{alerta.dias_atraso}d atraso</span>
          )}
        </div>
      </div>
      {onResolver && (
        <button
          onClick={() => onResolver(alerta)}
          className="mt-2.5 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors"
        >
          {resolverLabel ?? 'Resolver →'}
        </button>
      )}
    </div>
  )
}
