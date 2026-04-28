'use client'

// Error boundary específico do /painel — capta exceções de render/effect
// e exibe fallback amigável com botão de retry, em vez de retornar 500.

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function PainelError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[/painel] Erro renderizando:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <div className="text-3xl">⚠️</div>
        <h1 className="mt-3 text-lg font-bold text-red-900">Não foi possível carregar o Dashboard</h1>
        <p className="mt-2 text-sm text-red-800">
          Aconteceu um erro inesperado. As outras páginas continuam funcionando normalmente.
        </p>
        {error?.message && (
          <pre className="mt-3 overflow-x-auto rounded bg-white/70 p-2 text-left text-[11px] text-red-700">
            {error.message}
          </pre>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => reset()} className="bg-blue-600 hover:bg-blue-500">
            Tentar de novo
          </Button>
        </div>
        {error?.digest && (
          <p className="mt-3 text-[10px] text-red-600/70">ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
