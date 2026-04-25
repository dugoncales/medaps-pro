'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE, demoLinhas } from '@/lib/demo-data'

// Badge rápido para jornadas urgentes: conta linhas descontroladas sem computar jornadas completas
const JORNADAS_URGENTES = IS_DEMO_MODE
  ? demoLinhas.filter(l => l.status === 'ativo' && l.nivel_gravidade === 'descontrolado').length
  : 0

interface NavItem {
  href: string
  label: string
  icone: string
  badge?: number
}

interface SidebarProps {
  profissionalNome: string
  totalAlertas: number
  totalPacientes: number
}

const SECOES: { titulo: string; itens: NavItem[] }[] = [
  {
    titulo: 'Principal',
    itens: [
      { href: '/painel', label: 'Dashboard', icone: '📊' },
      { href: '/pacientes', label: 'Pacientes', icone: '👥' },
      { href: '/jornadas', label: 'Jornadas', icone: '🗺️' },
      { href: '/alertas', label: 'Alertas', icone: '🔔' },
    ],
  },
  {
    titulo: 'Protocolos',
    itens: [
      { href: '/protocolos', label: 'Linha de Cuidado', icone: '📚' },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { href: '/relatorio', label: 'Relatório Empresa', icone: '📈' },
    ],
  },
]

export function Sidebar({ profissionalNome, totalAlertas, totalPacientes }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const badges: Record<string, number> = {
    '/pacientes': totalPacientes,
    '/alertas': totalAlertas,
    '/jornadas': JORNADAS_URGENTES,
  }

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

  return (
    <aside className="flex w-[220px] flex-col border-r border-slate-200 bg-slate-900 text-slate-100 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-slate-700/50 px-4 py-4">
        <span className="text-2xl">🏥</span>
        <div>
          <p className="text-sm font-bold tracking-tight text-white">MedAPS Pro</p>
          <p className="text-xs text-slate-400">APS Empresarial</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {SECOES.map(secao => (
          <div key={secao.titulo}>
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {secao.titulo}
            </p>
            <ul className="space-y-0.5">
              {secao.itens.map(item => {
                const badge = badges[item.href]
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base">{item.icone}</span>
                        {item.label}
                      </span>
                      {badge !== undefined && badge > 0 && (
                        <span className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                          isActive(item.href) ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
                        )}>
                          {badge}
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
      <div className="border-t border-slate-700/50 p-3">
        <div className="mb-2 rounded-lg bg-slate-800 px-3 py-2">
          <p className="text-xs font-medium text-white truncate">{profissionalNome}</p>
          <p className="text-[10px] text-slate-400">Profissional de Saúde</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-left"
        >
          ↩ Sair do sistema
        </button>
      </div>
    </aside>
  )
}
