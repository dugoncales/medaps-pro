import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  subtexto?: string
  tendencia?: 'up' | 'down' | 'neutral'
  cor?: 'default' | 'green' | 'amber' | 'red' | 'blue'
  icone?: React.ReactNode
}

const COR_CLASS: Record<NonNullable<MetricCardProps['cor']>, string> = {
  default: 'text-slate-700',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
}

export function MetricCard({ label, value, subtexto, tendencia, cor = 'default', icone }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icone && <span className="text-slate-400">{icone}</span>}
      </div>
      <p className={cn('mt-2 text-3xl font-bold', COR_CLASS[cor])}>{value}</p>
      {subtexto && (
        <p className={cn(
          'mt-1 text-xs',
          tendencia === 'up' ? 'text-emerald-600' : tendencia === 'down' ? 'text-red-600' : 'text-slate-400'
        )}>
          {tendencia === 'up' ? '↑ ' : tendencia === 'down' ? '↓ ' : ''}{subtexto}
        </p>
      )}
    </div>
  )
}
