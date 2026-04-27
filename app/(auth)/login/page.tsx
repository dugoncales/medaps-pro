'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, ShieldCheck, Stethoscope, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const FEATURES = [
  {
    Icon: Stethoscope,
    title: '20 protocolos clínicos',
    desc: 'HAS, DM, Saúde Mental, Tabagismo e mais — automatizados.',
  },
  {
    Icon: TrendingUp,
    title: 'Jornadas inteligentes',
    desc: 'Próximas ações priorizadas por urgência clínica.',
  },
  {
    Icon: ShieldCheck,
    title: 'LGPD-ready',
    desc: 'Isolamento por empresa com Row Level Security.',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    if (IS_DEMO_MODE) {
      await new Promise(r => setTimeout(r, 600))
      router.push('/painel')
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Credenciais inválidas. Verifique e-mail e senha.')
      setCarregando(false)
      return
    }

    router.push('/painel')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-[#F9FAFB]">
      {/* ── Left panel: gradient + features ────────────────────────────────── */}
      <div
        className="relative hidden lg:flex flex-col justify-between w-[52%] p-12 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0A2540 0%, #1E3A8A 50%, #1E40AF 100%)' }}
      >
        {/* decorative gradient blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#3B82F6] opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-[#1E40AF] opacity-30 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1E40AF] shadow-[0_0_0_1px_rgba(59,130,246,0.4)]">
            <Activity className="h-6 w-6 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">MedAPS Pro</p>
            <p className="text-[11px] text-blue-200/80 -mt-0.5">APS Empresarial</p>
          </div>
        </div>

        {/* Headline + features */}
        <div className="relative z-10 max-w-md space-y-10">
          <div>
            <h2 className="text-[34px] font-bold leading-[1.15] tracking-tight">
              Gestão clínica baseada em protocolo, automatizada.
            </h2>
            <p className="mt-4 text-[15px] text-blue-100/80 leading-relaxed">
              Para ambulatórios de Atenção Primária empresarial que querem
              consistência clínica, indicadores claros e zero atrito operacional.
            </p>
          </div>

          <ul className="space-y-5">
            {FEATURES.map(({ Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15 backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-[13px] text-blue-100/75 leading-relaxed mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-blue-200/60">
          © {new Date().getFullYear()} MedAPS Pro · Sistema para profissionais de saúde
        </p>
      </div>

      {/* ── Right panel: form card ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1E40AF]">
              <Activity className="h-5 w-5 text-white" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-[#111827]">MedAPS Pro</p>
              <p className="text-[10px] text-[#6B7280] -mt-0.5">APS Empresarial</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.04)]">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Entrar na plataforma</h1>
              <p className="text-sm text-[#6B7280] mt-1">Acesso exclusivo para profissionais cadastrados.</p>
            </div>

            {IS_DEMO_MODE && (
              <div className="mb-5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                <p className="text-xs text-[#1E40AF] font-semibold">
                  Modo Demo · clique em <span className="font-bold">Entrar</span> para explorar
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-semibold text-[#111827]">
                  E-mail ou CRM
                </Label>
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  placeholder="medico@empresa.com.br"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={IS_DEMO_MODE}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className="text-[13px] font-semibold text-[#111827]">
                    Senha
                  </Label>
                  {!IS_DEMO_MODE && (
                    <a href="#" className="text-xs font-medium text-[#1E40AF] hover:text-[#1E3A8A] transition-colors">
                      Esqueci minha senha
                    </a>
                  )}
                </div>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  disabled={IS_DEMO_MODE}
                />
              </div>

              {erro && (
                <p className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#991B1B]">
                  {erro}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full mt-1"
                disabled={carregando}
              >
                {carregando ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-[#9CA3AF]">
            Suporte: <span className="font-medium text-[#6B7280]">contato@medaps.pro</span>
          </p>
        </div>
      </div>
    </div>
  )
}
