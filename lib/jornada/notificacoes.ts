'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ProximaAcao } from './proximas-acoes'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notificacao {
  id: string
  paciente_id: string
  paciente_nome: string
  protocolo: string
  acao: string
  motivo: string
  urgencia: 1 | 2 | 3 | 4 | 5
  tipo_contato: ProximaAcao['tipo_contato']
  lida: boolean
}

export interface UseNotificacoesReturn {
  notificacoes: Notificacao[]
  totalNaoLidas: number
  urgentes: number
  carregando: boolean
  marcarLida: (id: string) => void
  marcarTodasLidas: () => void
  recarregar: () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotificacoes(pollingMs = 5 * 60 * 1000): UseNotificacoesReturn {
  const [raw, setRaw] = useState<Omit<Notificacao, 'lida'>[]>([])
  const [lidasIds, setLidasIds] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)
  const mountedRef = useRef(true)

  const computar = useCallback(async () => {
    try {
      const { IS_DEMO_MODE } = await import('@/lib/demo-data')

      if (IS_DEMO_MODE) {
        // Demo: compute from demo data + gerarProximasAcoes
        const [
          { demoPacientes, demoLinhas, demoEvolucoes, demoConsultas, demoExames },
          { calcularJornada },
          { gerarProximasAcoes },
        ] = await Promise.all([
          import('@/lib/demo-data'),
          import('./motor'),
          import('./proximas-acoes'),
        ])

        const ativas = demoLinhas.filter(l => l.status === 'ativo')
        const pacientesMap = new Map(demoPacientes.map(p => [p.id, p]))

        const jornadasPorPaciente = new Map<string, import('./motor').StatusJornada[]>()

        await Promise.all(ativas.map(async (linha) => {
          const evolucoes = demoEvolucoes
            .filter(e => e.paciente_id === linha.paciente_id && e.protocolo_codigo === linha.protocolo_codigo)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          const ultima = evolucoes[0]
          const historico = demoConsultas
            .filter(c => c.paciente_id === linha.paciente_id)
            .map(c => {
              const ev = demoEvolucoes.find(e => e.consulta_id === c.id && e.protocolo_codigo === linha.protocolo_codigo)
              return { ...c, passo_protocolo: ev?.passo_protocolo, metricas: ev?.metricas ?? {} }
            })
          const exames = demoExames.filter(e => e.paciente_id === linha.paciente_id)
          const metricas = {
            ...((ultima?.metricas ?? {}) as Record<string, any>),
            passo_protocolo: ultima?.passo_protocolo ?? (linha.nivel_gravidade === 'controlado' ? 5 : linha.nivel_gravidade === 'parcial' ? 3 : 2),
          }
          const jornada = await calcularJornada(linha.paciente_id, linha.protocolo_codigo, metricas, historico, exames)
          if (!jornadasPorPaciente.has(linha.paciente_id)) jornadasPorPaciente.set(linha.paciente_id, [])
          jornadasPorPaciente.get(linha.paciente_id)!.push(jornada)
        }))

        const pacientesComJornadas = [...jornadasPorPaciente.entries()]
          .map(([pac_id, jornadas]) => {
            const pac = pacientesMap.get(pac_id)
            if (!pac) return null
            const ultimaConsulta = demoConsultas
              .filter(c => c.paciente_id === pac_id)
              .sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime())[0]
            const dias_sem_retorno = ultimaConsulta
              ? Math.floor((Date.now() - new Date(ultimaConsulta.data_consulta).getTime()) / 86400000)
              : 999
            const metricasFlat = demoEvolucoes
              .filter(e => e.paciente_id === pac_id)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .reduce((acc, e) => ({ ...acc, ...(e.metricas as Record<string, any>) }), {} as Record<string, any>)
            return { paciente: { id: pac_id, nome: pac.nome }, jornadas, metricas: metricasFlat, ultima_consulta: ultimaConsulta ?? null, dias_sem_retorno }
          })
          .filter(Boolean) as import('./proximas-acoes').PacienteComJornadas[]

        const acoes = gerarProximasAcoes(pacientesComJornadas)

        const novas: Omit<Notificacao, 'lida'>[] = acoes.map((a, i) => ({
          id: `demo-${i}-${a.paciente_id}-${a.protocolo}`,
          paciente_id: a.paciente_id,
          paciente_nome: a.paciente_nome,
          protocolo: a.protocolo,
          acao: a.acao,
          motivo: a.motivo,
          urgencia: a.urgencia,
          tipo_contato: a.tipo_contato,
        }))

        if (mountedRef.current) setRaw(novas)
        return
      }

      // Production: read from Supabase alertas table
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: alertas } = await supabase
        .from('alertas')
        .select('id, paciente_id, protocolo_codigo, titulo, descricao, prioridade, paciente:pacientes(nome)')
        .eq('resolvido', false)
        .in('prioridade', ['alta', 'critica', 'media'])
        .order('prioridade', { ascending: false })
        .limit(50)

      if (!mountedRef.current || !alertas) return

      const novas: Omit<Notificacao, 'lida'>[] = alertas.map(a => ({
        id: a.id,
        paciente_id: a.paciente_id,
        paciente_nome: (a.paciente as any)?.nome ?? 'Paciente',
        protocolo: a.protocolo_codigo,
        acao: a.titulo,
        motivo: a.descricao ?? '',
        urgencia: a.prioridade === 'critica' ? 5 : a.prioridade === 'alta' ? 4 : a.prioridade === 'media' ? 3 : 2,
        tipo_contato: a.prioridade === 'critica' ? 'telefonema' : 'consulta_presencial',
      }))

      setRaw(novas)
    } finally {
      if (mountedRef.current) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    computar()
    const interval = setInterval(computar, pollingMs)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [computar, pollingMs])

  const notificacoes: Notificacao[] = raw.map(n => ({ ...n, lida: lidasIds.has(n.id) }))

  return {
    notificacoes,
    totalNaoLidas: notificacoes.filter(n => !n.lida).length,
    urgentes: notificacoes.filter(n => n.urgencia >= 4 && !n.lida).length,
    carregando,
    marcarLida: (id) => setLidasIds(prev => new Set([...prev, id])),
    marcarTodasLidas: () => setLidasIds(new Set(raw.map(n => n.id))),
    recarregar: computar,
  }
}
