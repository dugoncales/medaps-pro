import { cn } from '@/lib/utils'
import type { Alerta } from '@/types'
import { prioridadeToUI } from '@/types'

interface AlertaItemProps {
  alerta: Alerta
  onResolver?: (id: string) => void
  compact?: boolean
}

const PRIORIDADE_STYLE = {
  urgente:     { border: 'border-red-200 bg-red-50',   badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  atencao:     { border: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  informativo: { border: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
}

const TIPO_LABEL: Record<Alerta['tipo'], string> = {
  retorno_vencido: 'Retorno vencido',
  exame_atrasado: 'Exame atrasado',
  meta_nao_atingida: 'Meta não atingida',
  urgencia: 'Urgência',
}

export function AlertaItem({ alerta, onResolver, compact }: AlertaItemProps) {
  const prioridade = prioridadeToUI(alerta.prioridade)
  const style = PRIORIDADE_STYLE[prioridade]

  return (
    <div className={cn('rounded-lg border p-3', style.border)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className={cn('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', style.dot)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{alerta.titulo}</p>
            {alerta.paciente && (
              <p className="text-xs text-slate-500 mt-0.5">
                {alerta.paciente.nome} · {alerta.paciente.matricula}
              </p>
            )}
            {!compact && alerta.descricao && (
              <p className="text-xs text-slate-600 mt-1">{alerta.descricao}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', style.badge)}>
            {TIPO_LABEL[alerta.tipo]}
          </span>
          {alerta.dias_atraso > 0 && (
            <span className="text-xs text-slate-400">{alerta.dias_atraso}d atraso</span>
          )}
        </div>
      </div>
      {onResolver && (
        <button
          onClick={() => onResolver(alerta.id)}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Resolver
        </button>
      )}
    </div>
  )
}
