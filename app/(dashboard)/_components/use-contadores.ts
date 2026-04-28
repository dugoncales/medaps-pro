'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  IS_DEMO_MODE,
  demoPacientes,
  demoAlertas,
  demoLinhas,
  demoConsultas,
} from '@/lib/demo-data'
import { useRuntimeStore } from '@/lib/store/runtime-store'

export interface Contadores {
  pacientes: number
  alertas: number
  jornadasUrgentes: number
  consultasHoje: number
  alertasUrgentes: number
  linhasAtivas: number
  linhasControladas: number
  controladosPct: number
}

function contadoresDemo(extraPacientes = 0, extraLinhas = 0): Contadores {
  const ativosLinhas = demoLinhas.filter(l => l.status === 'ativo')
  const controladas = ativosLinhas.filter(l => l.nivel_gravidade === 'controlado').length
  const total = ativosLinhas.length + extraLinhas
  const pct = total ? Math.round((controladas / total) * 100) : 0
  const hoje = new Date().toISOString().slice(0, 10)
  return {
    pacientes: demoPacientes.length + extraPacientes,
    alertas: demoAlertas.filter(a => !a.resolvido).length,
    jornadasUrgentes: ativosLinhas.filter(l => l.nivel_gravidade === 'descontrolado').length,
    consultasHoje: demoConsultas.filter(c => c.data_consulta.slice(0, 10) === hoje).length,
    alertasUrgentes: demoAlertas.filter(a => !a.resolvido && (a.prioridade === 'critica' || a.prioridade === 'alta')).length,
    linhasAtivas: total,
    linhasControladas: controladas,
    controladosPct: pct,
  }
}

/**
 * Hook unificado de contadores. Em demo mode usa arrays in-memory
 * e o runtime-store; em modo real conecta ao Supabase com realtime.
 */
export function useContadores(): Contadores {
  const pacientesRuntime = useRuntimeStore(s => s.pacientes)
  const linhasRuntime = useRuntimeStore(s => s.linhas)
  const [cReal, setCReal] = useState<Contadores>(() => contadoresDemo(0, 0))

  const cDemo = useMemo(
    () => contadoresDemo(pacientesRuntime.length, linhasRuntime.length),
    [pacientesRuntime.length, linhasRuntime.length],
  )

  useEffect(() => {
    if (IS_DEMO_MODE) return

    const supabase = createClient()
    let cancelado = false

    async function fetchTudo() {
      const hojeIni = new Date()
      hojeIni.setHours(0, 0, 0, 0)
      const hojeFim = new Date()
      hojeFim.setHours(23, 59, 59, 999)

      const [
        pacRes,
        alertasRes,
        urgRes,
        consHojeRes,
        alertasUrgRes,
        linhasAtivasRes,
        linhasCtrRes,
      ] = await Promise.all([
        supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('alertas').select('*', { count: 'exact', head: true }).eq('resolvido', false),
        supabase.from('linhas_cuidado').select('*', { count: 'exact', head: true })
          .eq('status', 'ativo').eq('nivel_gravidade', 'descontrolado'),
        supabase.from('consultas').select('*', { count: 'exact', head: true })
          .gte('data_consulta', hojeIni.toISOString())
          .lte('data_consulta', hojeFim.toISOString()),
        supabase.from('alertas').select('*', { count: 'exact', head: true })
          .eq('resolvido', false).in('prioridade', ['alta', 'critica']),
        supabase.from('linhas_cuidado').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('linhas_cuidado').select('*', { count: 'exact', head: true })
          .eq('status', 'ativo').eq('nivel_gravidade', 'controlado'),
      ])

      if (cancelado) return

      const linhasAtivas = linhasAtivasRes.count ?? 0
      const linhasCtr = linhasCtrRes.count ?? 0
      setCReal({
        pacientes: pacRes.count ?? 0,
        alertas: alertasRes.count ?? 0,
        jornadasUrgentes: urgRes.count ?? 0,
        consultasHoje: consHojeRes.count ?? 0,
        alertasUrgentes: alertasUrgRes.count ?? 0,
        linhasAtivas,
        linhasControladas: linhasCtr,
        controladosPct: linhasAtivas ? Math.round((linhasCtr / linhasAtivas) * 100) : 0,
      })
    }

    fetchTudo()

    const ch = supabase
      .channel('medaps-contadores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linhas_cuidado' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' }, fetchTudo)
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(ch)
    }
  }, [])

  return IS_DEMO_MODE ? cDemo : cReal
}
