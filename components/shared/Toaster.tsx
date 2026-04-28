'use client'

import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useToastStore, type ToastTipo } from '@/lib/store/toast-store'
import { cn } from '@/lib/utils'

const ESTILO: Record<ToastTipo, { icone: React.ReactNode; classe: string; corTitulo: string; corCorpo: string }> = {
  sucesso: {
    icone: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    classe: 'border-emerald-200 bg-white',
    corTitulo: 'text-emerald-800',
    corCorpo: 'text-emerald-700/80',
  },
  aviso: {
    icone: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    classe: 'border-amber-300 bg-amber-50',
    corTitulo: 'text-amber-900',
    corCorpo: 'text-amber-800/90',
  },
  critico: {
    icone: <AlertCircle className="h-5 w-5 text-red-600" />,
    classe: 'border-red-300 bg-red-50 ring-2 ring-red-200',
    corTitulo: 'text-red-900 font-bold',
    corCorpo: 'text-red-800',
  },
  info: {
    icone: <Info className="h-5 w-5 text-blue-600" />,
    classe: 'border-blue-200 bg-white',
    corTitulo: 'text-blue-800',
    corCorpo: 'text-blue-700/80',
  },
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Notificações"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const e = ESTILO[t.tipo]
        return (
          <div
            key={t.id}
            role={t.tipo === 'critico' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-sm transition-all',
              e.classe,
            )}
          >
            <div className="shrink-0 mt-0.5">{e.icone}</div>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm leading-tight', e.corTitulo)}>{t.titulo}</p>
              {t.descricao && (
                <p className={cn('mt-1 text-xs leading-snug', e.corCorpo)}>{t.descricao}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Fechar notificação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
