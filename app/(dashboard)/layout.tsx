import { redirect } from 'next/navigation'
import { IS_DEMO_MODE, demoProfissional, demoAlertas } from '@/lib/demo-data'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './_components/sidebar'
import { Topbar } from './_components/topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let profissionalNome = demoProfissional.nome
  let totalAlertas = demoAlertas.filter(a => !a.resolvido).length
  const totalPacientes = 8

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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        profissionalNome={profissionalNome}
        totalAlertas={totalAlertas}
        totalPacientes={totalPacientes}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar profissionalNome={profissionalNome} totalAlertas={totalAlertas} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
