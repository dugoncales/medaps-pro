'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 border border-blue-400/30 mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MedAPS Pro</h1>
          <p className="text-blue-300 mt-1 text-sm">Gestão de Protocolos Clínicos · APS Empresarial</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl">
          {IS_DEMO_MODE && (
            <div className="mb-5 rounded-lg border border-blue-400/30 bg-blue-500/10 p-3 text-center">
              <p className="text-xs text-blue-300 font-medium">Modo Demo ativo — clique em Entrar para explorar</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 text-sm">
                E-mail ou CRM
              </Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                placeholder="medico@empresa.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:border-blue-400"
                disabled={IS_DEMO_MODE}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-slate-200 text-sm">
                Senha
              </Label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:border-blue-400"
                disabled={IS_DEMO_MODE}
              />
            </div>

            {erro && (
              <p className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                {erro}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 font-semibold"
              disabled={carregando}
            >
              {carregando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          {!IS_DEMO_MODE && (
            <div className="mt-4 text-center">
              <a href="#" className="text-xs text-slate-400 hover:text-blue-300 transition-colors">
                Esqueci minha senha
              </a>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Acesso exclusivo para profissionais de saúde cadastrados
        </p>
      </div>
    </div>
  )
}
