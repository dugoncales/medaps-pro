import { cn } from '@/lib/utils'
import type { StatusControle } from '@/types'

interface StatusPillProps {
  status: StatusControle
  size?: 'sm' | 'md'
  className?: string
}

const CONFIG: Record<StatusControle, { label: string; className: string; dot: string }> = {
  controlado:    { label: 'Controlado',    className: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]', dot: 'bg-[#059669]' },
  parcial:       { label: 'Parcial',       className: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]', dot: 'bg-[#D97706]' },
  descontrolado: { label: 'Descontrolado', className: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]', dot: 'bg-[#DC2626]' },
}

export function StatusPill({ status, size = 'md', className }: StatusPillProps) {
  const { label, className: colorClass, dot } = CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        colorClass,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </span>
  )
}
