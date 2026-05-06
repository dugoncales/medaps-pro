'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

interface DashboardShellProps {
  profissionalNome: string
  totalAlertas: number
  children: React.ReactNode
}

export function DashboardShell({
  profissionalNome,
  totalAlertas,
  children,
}: DashboardShellProps) {
  const [drawerAberto, setDrawerAberto] = useState(false)

  // Esc fecha o drawer no mobile.
  useEffect(() => {
    if (!drawerAberto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerAberto(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerAberto])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        profissionalNome={profissionalNome}
        drawerAberto={drawerAberto}
        onClose={() => setDrawerAberto(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          profissionalNome={profissionalNome}
          totalAlertas={totalAlertas}
          onMenuClick={() => setDrawerAberto(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
