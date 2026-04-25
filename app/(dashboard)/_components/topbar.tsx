'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useNotificacoes } from '@/lib/jornada/notificacoes'
import { urgenciaBadge, contatoIcon } from '@/lib/jornada/proximas-acoes'
import { PROTOCOLO_MAP } from '@/lib/protocolos'

const PAGE_TITLES: Record<string, string> = {
  '/painel':    'Dashboard',
  '/pacientes': 'Pacientes',
  '/jornadas':  'Jornadas',
  '/alertas':   'Alertas',
  '/protocolos':'Linha de Cuidado',
  '/relatorio': 'Relatório Empresa',
}

interface TopbarProps {
  profissionalNome: string
  totalAlertas: number
}

export function Topbar({ profissionalNome, totalAlertas }: TopbarProps) {
  const pathname = usePathname()
  const [painelAberto, setPainelAberto] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)
  const { notificacoes, urgentes, totalNaoLidas, carregando, marcarLida, marcarTodasLidas } = useNotificacoes()

  const titulo = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname === key || pathname.startsWith(key + '/'))?.[1] ?? 'MedAPS Pro'

  const initials = profissionalNome
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  // Count to display: live urgentes (computed) or SSR totalAlertas as fallback
  const badgeCount = carregando ? totalAlertas : totalNaoLidas
  const isCritical = urgentes > 0 || badgeCount >= 5

  // Close panel when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) {
        setPainelAberto(false)
      }
    }
    if (painelAberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [painelAberto])

  const listaExibida = notificacoes.filter(n => !n.lida).slice(0, 8)

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0 relative z-20">
      <h1 className="text-lg font-semibold text-slate-800">{titulo}</h1>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={painelRef}>
          <button
            onClick={() => setPainelAberto(v => !v)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Notificações"
          >
            <span className="text-lg">🔔</span>
            {badgeCount > 0 && (
              <span className={cn(
                'absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white',
                isCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
              )}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>

          {/* Notification panel */}
          {painelAberto && (
            <div className="absolute right-0 top-full mt-2 w-[380px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm">Notificações</span>
                  {totalNaoLidas > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      {totalNaoLidas}
                    </span>
                  )}
                </div>
                {totalNaoLidas > 0 && (
                  <button
                    onClick={marcarTodasLidas}
                    className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto">
                {carregando && (
                  <div className="flex items-center justify-center py-8 text-sm text-slate-400">
                    Carregando…
                  </div>
                )}
                {!carregando && listaExibida.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <span className="text-2xl">✅</span>
                    <p className="text-sm text-slate-500">Nenhuma notificação pendente.</p>
                  </div>
                )}
                {listaExibida.map(notif => {
                  const badge = urgenciaBadge(notif.urgencia)
                  const proto = PROTOCOLO_MAP.get(notif.protocolo)
                  return (
                    <div
                      key={notif.id}
                      className="flex gap-3 border-b border-slate-50 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xl shrink-0 mt-0.5">{contatoIcon(notif.tipo_contato)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-slate-800 truncate">{notif.paciente_nome}</span>
                          <span
                            className="rounded px-1 py-0.5 text-[9px] font-bold text-white shrink-0"
                            style={{ backgroundColor: proto?.cor ?? '#6b7280' }}
                          >
                            {notif.protocolo}
                          </span>
                          <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0', badge.className)}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-snug truncate">{notif.acao}</p>
                        <p className="text-[11px] text-slate-400 leading-snug truncate mt-0.5">{notif.motivo}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Link
                          href={`/pacientes/${notif.paciente_id}/consulta`}
                          onClick={() => { marcarLida(notif.id); setPainelAberto(false) }}
                          className="rounded px-2 py-1 text-[10px] font-semibold text-white transition-colors"
                          style={{ backgroundColor: proto?.cor ?? '#3b82f6' }}
                        >
                          Atender
                        </Link>
                        <button
                          onClick={() => marcarLida(notif.id)}
                          className="rounded px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                          Resolver
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Panel footer */}
              <div className="border-t border-slate-100 px-4 py-2.5">
                <Link
                  href="/jornadas"
                  onClick={() => setPainelAberto(false)}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                  🗺️ Ver todas as jornadas →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {initials}
        </div>
      </div>
    </header>
  )
}
