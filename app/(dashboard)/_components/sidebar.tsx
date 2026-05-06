'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Map,
  Bell,
  Stethoscope,
  TrendingUp,
  LogOut,
  Activity,
  ClipboardList,
  Send,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { useContadores } from './use-contadores'

interface NavItem {
  href: string
  label: string
  Icon: LucideIcon
  badgeKey?: 'pacientes' | 'alertas' | 'jornadasUrgentes'
}

interface SidebarProps {
  profissionalNome: string
  drawerAberto?: boolean
  onClose?: () => void
}

const SECOES: { titulo: string; itens: NavItem[] }[] = [
  {
    titulo: 'Principal',
    itens: [
      { href: '/painel',    label: 'Dashboard', Icon: LayoutDashboard },
      { href: '/pacientes', label: 'Pacientes', Icon: Users, badgeKey: 'pacientes' },
      { href: '/jornadas',  label: 'Jornadas',  Icon: Map, badgeKey: 'jornadasUrgentes' },
      { href: '/alertas',   label: 'Alertas',   Icon: Bell, badgeKey: 'alertas' },
    ],
  },
  {
    titulo: 'Escalas',
    itens: [
      { href: '/escalas', label: 'PROMs e PREMs', Icon: ClipboardList },
      { href: '/envios',  label: 'Envios',         Icon: Send },
    ],
  },
  {
    titulo: 'Protocolos',
    itens: [
      { href: '/protocolos', label: 'Linha de Cuidado', Icon: Stethoscope },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { href: '/relatorio', label: 'Relatório Empresa', Icon: TrendingUp },
    ],
  },
]

export function Sidebar({ profissionalNome, drawerAberto = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const contadores = useContadores()

  async function handleLogout() {
    if (!IS_DEMO_MODE) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/painel') return pathname === '/painel'
    return pathname.startsWith(href)
  }

  const initials = profissionalNome
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <>
      {/* Overlay (mobile somente) — clica para fechar */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-200',
          drawerAberto ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={cn(
          'flex flex-col text-slate-100 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]',
          // Mobile: drawer fixo, transladado para fora quando fechado
          'fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-200 ease-out',
          drawerAberto ? 'translate-x-0' : '-translate-x-full',
          // Desktop: estático, sempre visível
          'md:relative md:z-auto md:w-[240px] md:translate-x-0 md:shrink-0 md:transition-none',
        )}
        style={{ background: 'linear-gradient(180deg, #0A2540 0%, #1E3A5F 100%)' }}
        aria-label="Navegação principal"
      >
        {/* Logo + close (mobile) */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-[18px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E40AF] shadow-[0_0_0_1px_rgba(59,130,246,0.3)]">
            <Activity className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-white">MedAPS Pro</p>
            <p className="text-[11px] text-slate-400 truncate">APS Empresarial</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {SECOES.map((secao, idx) => (
          <div key={secao.titulo} className={cn(idx > 0 && 'mt-5')}>
            <p className="mb-2 px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {secao.titulo}
            </p>
            <ul className="space-y-0.5">
              {secao.itens.map((item) => {
                const ativo = isActive(item.href)
                const badge = item.badgeKey ? contadores[item.badgeKey] : undefined
                const Icon = item.Icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group relative flex items-center gap-3 px-5 py-2 text-[13px] font-medium transition-colors',
                        'border-l-[3px]',
                        ativo
                          ? 'border-l-[#3B82F6] bg-[#1E40AF]/85 text-white'
                          : 'border-l-transparent text-slate-300/85 hover:bg-white/[0.04] hover:text-white',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors',
                          ativo ? 'text-white' : 'text-slate-400 group-hover:text-slate-200',
                        )}
                        strokeWidth={2}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge !== undefined && badge > 0 && (
                        <span className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none num-tabular',
                          ativo
                            ? 'bg-white/15 text-white'
                            : 'bg-[#3B82F6] text-white',
                        )}>
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
            {initials || 'MD'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-white leading-tight">{profissionalNome}</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Profissional de Saúde</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Sair"
            title="Sair do sistema"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}
