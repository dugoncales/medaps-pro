import { cn } from '@/lib/utils'
import type { StatusControle } from '@/types'

interface StatusPillProps {
  status: StatusControle
  size?: 'sm' | 'md'
  className?: string
}

const CONFIG: Record<StatusControle, { label: string; className: string }> = {
  controlado: { label: 'Controlado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  parcial:    { label: 'Parcial',    className: 'bg-amber-100 text-amber-800 border-amber-200' },
  descontrolado: { label: 'Descontrolado', className: 'bg-red-100 text-red-800 border-red-200' },
}

export function StatusPill({ status, size = 'md', className }: StatusPillProps) {
  const { label, className: colorClass } = CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
