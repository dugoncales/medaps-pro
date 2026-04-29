'use client'

// Subscribe à tabela `alertas` (apenas modo real) e dispara um toast quando
// chega um INSERT vindo de envio remoto (metadata.origem='remoto').
// O caso presencial já dispara o toast localmente, então filtramos por origem.

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { useToastStore } from '@/lib/store/toast-store'

interface AlertaRow {
  id: string
  paciente_id: string
  tipo: string
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  titulo: string
  descricao: string | null
  metadata: { origem?: string; escala_codigo?: string; score?: number } | null
}

function uniqueChannelName(prefix: string): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  return `${prefix}-${id}`
}

export function AlertaToastListener() {
  const push = useToastStore((s) => s.push)
  // Evita re-disparar toast caso o realtime envie o mesmo ID 2x (ex. reconexão)
  const vistosRef = useRef<Set<string>>(new Set())
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (IS_DEMO_MODE) return
    if (channelRef.current) return // já tem canal ativo

    const supabase = createClient()

    const ch = supabase
      .channel(uniqueChannelName('alertas-toast'))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alertas' },
        async (payload) => {
          const novo = payload.new as AlertaRow
          if (vistosRef.current.has(novo.id)) return
          vistosRef.current.add(novo.id)

          // Só disparamos toast para alertas de origem remota
          if (novo.metadata?.origem !== 'remoto') return

          // Buscar nome do paciente para o título do toast
          const { data: pac } = await supabase
            .from('pacientes')
            .select('nome')
            .eq('id', novo.paciente_id)
            .single()
          const primeiroNome = pac?.nome?.split(' ')[0] ?? 'Paciente'
          const score = novo.metadata?.score ?? '-'
          const escala = novo.metadata?.escala_codigo ?? 'escala'

          const tipo =
            novo.prioridade === 'critica' ? 'critico'
            : novo.prioridade === 'alta'  ? 'aviso'
            : 'aviso'

          push({
            tipo,
            titulo: `${primeiroNome} respondeu ${escala} — Score ${score}`,
            descricao: `Alerta gerado: ${novo.titulo}`,
            duracao: 10000,
          })
        },
      )
      .subscribe()

    channelRef.current = ch

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [push])

  return null
}
