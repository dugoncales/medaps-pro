import { cn } from '@/lib/utils'

interface ProgressoProtocoloProps {
  label: string
  codigo: string
  pct: number
  total?: number
  icone?: string
}

export function ProgressoProtocolo({ label, codigo, pct, total, icone }: ProgressoProtocoloProps) {
  const cor =
    pct >= 70 ? 'bg-emerald-500' :
    pct >= 50 ? 'bg-amber-500' :
    'bg-red-500'

  const textCor =
    pct >= 70 ? 'text-emerald-600' :
    pct >= 50 ? 'text-amber-600' :
    'text-red-600'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icone && <span>{icone}</span>}
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-xs text-slate-400">({codigo})</span>
        </div>
        <div className="flex items-center gap-2">
          {total !== undefined && <span className="text-xs text-slate-400">{total} pac.</span>}
          <span className={cn('font-semibold', textCor)}>{pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all', cor)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}
