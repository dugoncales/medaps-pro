import { redirect } from 'next/navigation'
import { IS_DEMO_MODE, demoProfissional, demoAlertas } from '@/lib/demo-data'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './_components/dashboard-shell'
import { AlertaToastListener } from './_components/alerta-toast-listener'
import { Toaster } from '@/components/shared/Toaster'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let profissionalNome = demoProfissional.nome
  let totalAlertas = demoAlertas.filter(a => !a.resolvido).length

  if (!IS_DEMO_MODE) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: prof } = await supabase
      .from('profissionais')
      .select('nome')
      .eq('user_id', user.id)
      .single()

    profissionalNome = prof?.nome ?? user.email ?? 'Profissional'

    const { count } = await supabase
      .from('alertas')
      .select('id', { count: 'exact', head: true })
      .eq('resolvido', false)

    totalAlertas = count ?? 0
  }

  return (
    <>
      <DashboardShell profissionalNome={profissionalNome} totalAlertas={totalAlertas}>
        {children}
      </DashboardShell>
      <AlertaToastListener />
      <Toaster />
    </>
  )
}
