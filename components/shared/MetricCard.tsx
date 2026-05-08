import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  subtexto?: string
  tendencia?: 'up' | 'down' | 'neutral'
  cor?: 'default' | 'green' | 'amber' | 'red' | 'blue'
  icone?: React.ReactNode
  carregando?: boolean
  /**
   * Variação numérica vs. período anterior (ex.: +5 ou -8). Quando informado,
   * substitui `tendencia` para inferir a direção (positivo→up, negativo→down).
   * Para métricas onde "menor é melhor" (alertas, descontrolados), passe
   * `inverterDelta` para que negativo apareça verde.
   */
  delta?: number
  /** Sufixo do delta — ex.: 'pp' (pontos percentuais), '%', ''. */
  deltaSufixo?: string
  /** Inverte a polaridade visual do delta (menor é melhor). */
  inverterDelta?: boolean
  /** Série numérica para sparkline (mín. 2 pontos). */
  sparkline?: number[]
}

const VALUE_COLOR: Record<NonNullable<MetricCardProps['cor']>, string> = {
  default: 'text-[#111827]',
  green: 'text-[#059669]',
  amber: 'text-[#D97706]',
  red: 'text-[#DC2626]',
  blue: 'text-[#1E40AF]',
}

const SPARKLINE_STROKE: Record<NonNullable<MetricCardProps['cor']>, string> = {
  default: '#94A3B8',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',
}

const TREND_COLOR: Record<NonNullable<MetricCardProps['tendencia']>, string> = {
  up: 'text-[#059669]',
  down: 'text-[#DC2626]',
  neutral: 'text-[#6B7280]',
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const w = 80
  const h = 24
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)

  const points = data
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const areaPoints = `0,${h} ${points} ${w},${h}`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <polygon points={areaPoints} fill={color} fillOpacity={0.12} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MetricCard({
  label,
  value,
  subtexto,
  tendencia,
  cor = 'default',
  icone,
  carregando,
  delta,
  deltaSufixo = '',
  inverterDelta = false,
  sparkline,
}: MetricCardProps) {
  const deltaDirecao: 'up' | 'down' | 'neutral' | undefined =
    typeof delta === 'number'
      ? delta > 0
        ? 'up'
        : delta < 0
        ? 'down'
        : 'neutral'
      : undefined

  // polaridade visual: para métricas "menor é melhor", down vira verde
  const tendenciaVisual: 'up' | 'down' | 'neutral' | undefined = (() => {
    if (deltaDirecao) {
      if (inverterDelta) {
        if (deltaDirecao === 'up') return 'down'
        if (deltaDirecao === 'down') return 'up'
        return 'neutral'
      }
      return deltaDirecao
    }
    return tendencia
  })()

  const TrendIcon =
    tendenciaVisual === 'up' ? ArrowUpRight :
    tendenciaVisual === 'down' ? ArrowDownRight :
    tendenciaVisual === 'neutral' ? Minus :
    null

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_2px_4px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
          {label}
        </p>
        {icone && <span className="text-[#9CA3AF] text-base leading-none">{icone}</span>}
      </div>

      {carregando ? (
        <div
          className="mt-3 h-9 w-24 rounded-md bg-slate-100 animate-pulse"
          aria-label="Carregando"
          role="status"
        />
      ) : (
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className={cn(
            'text-[32px] font-bold leading-[1.1] tracking-tight num-tabular',
            VALUE_COLOR[cor],
          )}>
            {value}
          </p>
          {sparkline && sparkline.length >= 2 && (
            <div className="shrink-0 pb-1">
              <Sparkline data={sparkline} color={SPARKLINE_STROKE[cor]} />
            </div>
          )}
        </div>
      )}

      {carregando ? (
        <div className="mt-2 h-3 w-32 rounded bg-slate-100 animate-pulse" />
      ) : (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {typeof delta === 'number' && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold num-tabular',
                tendenciaVisual === 'up' && 'bg-emerald-50 text-emerald-700',
                tendenciaVisual === 'down' && 'bg-red-50 text-red-700',
                tendenciaVisual === 'neutral' && 'bg-slate-50 text-slate-600',
              )}
            >
              {deltaDirecao === 'up' ? '▲' : deltaDirecao === 'down' ? '▼' : '='}
              {Math.abs(delta)}
              {deltaSufixo}
            </span>
          )}
          {subtexto && (
            <div className={cn(
              'flex items-center gap-1 font-medium',
              typeof delta === 'number' ? 'text-[#6B7280]' : tendenciaVisual ? TREND_COLOR[tendenciaVisual] : 'text-[#6B7280]',
            )}>
              {TrendIcon && typeof delta !== 'number' && <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.25} />}
              <span>{subtexto}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
