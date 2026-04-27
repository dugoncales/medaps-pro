import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  subtexto?: string
  tendencia?: 'up' | 'down' | 'neutral'
  cor?: 'default' | 'green' | 'amber' | 'red' | 'blue'
  icone?: React.ReactNode
}

const VALUE_COLOR: Record<NonNullable<MetricCardProps['cor']>, string> = {
  default: 'text-[#111827]',
  green: 'text-[#059669]',
  amber: 'text-[#D97706]',
  red: 'text-[#DC2626]',
  blue: 'text-[#1E40AF]',
}

const TREND_COLOR: Record<NonNullable<MetricCardProps['tendencia']>, string> = {
  up: 'text-[#059669]',
  down: 'text-[#DC2626]',
  neutral: 'text-[#6B7280]',
}

export function MetricCard({ label, value, subtexto, tendencia, cor = 'default', icone }: MetricCardProps) {
  const TrendIcon =
    tendencia === 'up' ? ArrowUpRight :
    tendencia === 'down' ? ArrowDownRight :
    tendencia === 'neutral' ? Minus :
    null

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_2px_4px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
          {label}
        </p>
        {icone && <span className="text-[#9CA3AF] text-base leading-none">{icone}</span>}
      </div>

      <p className={cn(
        'mt-3 text-[32px] font-bold leading-[1.1] tracking-tight num-tabular',
        VALUE_COLOR[cor],
      )}>
        {value}
      </p>

      {subtexto && (
        <div className={cn(
          'mt-2 flex items-center gap-1 text-xs font-medium',
          tendencia ? TREND_COLOR[tendencia] : 'text-[#6B7280]',
        )}>
          {TrendIcon && <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.25} />}
          <span>{subtexto}</span>
        </div>
      )}
    </div>
  )
}
