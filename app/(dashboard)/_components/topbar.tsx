'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Search,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Map,
  Menu,
  LogOut,
  User as UserIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificacoes } from '@/lib/jornada/notificacoes'
import { urgenciaBadge, contatoIcon } from '@/lib/jornada/proximas-acoes'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'

const PAGE_TITLES: Record<string, string> = {
  '/painel':    'Dashboard',
  '/pacientes': 'Pacientes',
  '/jornadas':  'Jornadas',
  '/alertas':   'Alertas',
  '/escalas':   'Escalas',
  '/envios':    'Envios',
  '/protocolos':'Linha de Cuidado',
  '/relatorio': 'Relatório Empresa',
}

interface Crumb { label: string; href?: string }

function buildBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'Início' }]

  const crumbs: Crumb[] = []
  let acc = ''
  for (let i = 0; i < segments.length; i++) {
    acc += '/' + segments[i]
    const isUUID = /^[0-9a-f]{8}|^pac-/i.test(segments[i])
    let label: string
    if (PAGE_TITLES[acc]) {
      label = PAGE_TITLES[acc]
    } else if (segments[i] === 'novo') {
      label = 'Novo'
    } else if (segments[i] === 'consulta') {
      label = 'Consulta'
    } else if (isUUID) {
      label = 'Detalhe'
    } else {
      label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1)
    }
    crumbs.push({ label, href: i < segments.length - 1 ? acc : undefined })
  }
  return crumbs
}

interface TopbarProps {
  profissionalNome: string
  totalAlertas: number
  onMenuClick?: () => void
}

export function Topbar({ profissionalNome, totalAlertas, onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [painelAberto, setPainelAberto] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)
  const perfilRef = useRef<HTMLDivElement>(null)
  const { notificacoes, urgentes, totalNaoLidas, carregando, marcarLida, marcarTodasLidas } = useNotificacoes()

  const crumbs = buildBreadcrumbs(pathname)
  const initials = profissionalNome
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'MD'

  const badgeCount = carregando ? totalAlertas : totalNaoLidas
  const isCritical = urgentes > 0 || badgeCount >= 5

  // Fechar painéis ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (painelRef.current && !painelRef.current.contains(target)) setPainelAberto(false)
      if (perfilRef.current && !perfilRef.current.contains(target)) setPerfilAberto(false)
    }
    if (painelAberto || perfilAberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [painelAberto, perfilAberto])

  // Atalho Cmd+K → focar search
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleLogout() {
    if (!IS_DEMO_MODE) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push('/login')
    router.refresh()
  }

  const listaExibida = notificacoes.filter(n => !n.lida).slice(0, 8)

  // Apenas a última breadcrumb (página atual) — usada como título compacto no mobile
  const tituloAtual = crumbs[crumbs.length - 1]?.label ?? ''

  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-3 md:px-6 shrink-0 relative z-20 gap-2">
      {/* Esquerda: hamburguer (mobile) + breadcrumb (desktop) ou título (mobile) */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden rounded-lg p-2 text-ink-muted hover:bg-surface-subtle hover:text-ink transition-colors -ml-1"
          aria-label="Abrir menu"
        >
          <Menu className="h-[20px] w-[20px]" strokeWidth={2} />
        </button>

        {/* Breadcrumb completo — desktop */}
        <nav className="hidden md:flex items-center gap-1.5 text-[13px] min-w-0" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-soft shrink-0" />}
              {c.href ? (
                <Link href={c.href} className="text-ink-muted hover:text-ink transition-colors truncate">
                  {c.label}
                </Link>
              ) : (
                <span className={cn('truncate', i === crumbs.length - 1 ? 'font-semibold text-ink' : 'text-ink-muted')}>
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Título compacto — mobile (substitui o breadcrumb) */}
        <p className="md:hidden truncate text-[14px] font-semibold text-ink min-w-0">
          {tituloAtual}
        </p>
      </div>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar pacientes, protocolos…"
            className={cn(
              'w-full rounded-lg border border-line bg-surface-subtle py-2 pl-9 pr-16 text-[13px] text-ink',
              'placeholder:text-ink-soft outline-none transition-colors',
              'hover:border-line-strong focus:border-brand-action focus:bg-surface focus:ring-2 focus:ring-brand-action/20',
            )}
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] font-mono text-ink-muted">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <div className="relative" ref={painelRef}>
          <button
            onClick={() => { setPainelAberto(v => !v); setPerfilAberto(false) }}
            className="relative rounded-lg p-2 text-ink-muted hover:bg-surface-subtle hover:text-ink transition-colors"
            aria-label="Notificações"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            {badgeCount > 0 && (
              <span className={cn(
                'absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white num-tabular',
                isCritical ? 'bg-danger animate-pulse' : 'bg-warning',
              )}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>

          {painelAberto && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-[400px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink">Notificações</span>
                  {totalNaoLidas > 0 && (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                      {totalNaoLidas}
                    </span>
                  )}
                </div>
                {totalNaoLidas > 0 && (
                  <button
                    onClick={marcarTodasLidas}
                    className="text-[11px] font-medium text-ink-muted hover:text-brand-action transition-colors"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {carregando && (
                  <div className="flex items-center justify-center py-10 text-[13px] text-ink-muted">
                    Carregando…
                  </div>
                )}
                {!carregando && listaExibida.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <CheckCircle2 className="h-6 w-6 text-success" strokeWidth={2} />
                    <p className="text-[13px] text-ink-muted">Nenhuma notificação pendente.</p>
                  </div>
                )}
                {listaExibida.map(notif => {
                  const badge = urgenciaBadge(notif.urgencia)
                  const proto = PROTOCOLO_MAP.get(notif.protocolo)
                  return (
                    <div
                      key={notif.id}
                      className="flex gap-3 border-b border-line/60 px-4 py-3 hover:bg-surface-subtle transition-colors last:border-b-0"
                    >
                      <span className="text-lg shrink-0 mt-0.5">{contatoIcon(notif.tipo_contato)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="text-[12px] font-semibold text-ink truncate">{notif.paciente_nome}</span>
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
                        <p className="text-[12px] text-ink-muted leading-snug truncate">{notif.acao}</p>
                        <p className="text-[11px] text-ink-soft leading-snug truncate mt-0.5">{notif.motivo}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Link
                          href={`/pacientes/${notif.paciente_id}/consulta`}
                          onClick={() => { marcarLida(notif.id); setPainelAberto(false) }}
                          className="rounded-md px-2 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: proto?.cor ?? '#3b82f6' }}
                        >
                          Atender
                        </Link>
                        <button
                          onClick={() => marcarLida(notif.id)}
                          className="rounded-md border border-line px-2 py-1 text-[10px] font-medium text-ink-muted hover:bg-surface-subtle transition-colors"
                        >
                          Resolver
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-line/70 px-4 py-2.5">
                <Link
                  href="/jornadas"
                  onClick={() => setPainelAberto(false)}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-brand-action hover:text-brand transition-colors"
                >
                  <Map className="h-3.5 w-3.5" />
                  Ver todas as jornadas
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Avatar com dropdown */}
        <div className="relative" ref={perfilRef}>
          <button
            onClick={() => { setPerfilAberto(v => !v); setPainelAberto(false) }}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface-subtle transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
              {initials}
            </div>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-ink-soft transition-transform',
                perfilAberto && 'rotate-180',
              )}
              strokeWidth={2.25}
            />
          </button>

          {perfilAberto && (
            <div className="absolute right-0 top-full mt-2 w-[240px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)]">
              <div className="border-b border-line/70 px-4 py-3">
                <p className="text-[13px] font-semibold text-ink truncate">{profissionalNome}</p>
                <p className="text-[11px] text-ink-muted">Profissional de Saúde</p>
              </div>
              <div className="py-1">
                <button className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-ink hover:bg-surface-subtle transition-colors">
                  <UserIcon className="h-4 w-4 text-ink-muted" strokeWidth={2} />
                  Meu perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-ink hover:bg-surface-subtle transition-colors"
                >
                  <LogOut className="h-4 w-4 text-ink-muted" strokeWidth={2} />
                  Sair do sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
