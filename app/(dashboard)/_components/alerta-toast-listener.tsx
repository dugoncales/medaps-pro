'use client'

// Subscribe à tabela `alertas` (apenas modo real) e dispara um toast quando
// chega um INSERT vindo de envio remoto (metadata.origem='remoto').
// O caso presencial já dispara o toast localmente, então filtramos por origem.

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { subscribeTable } from '@/lib/supabase/realtime'
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

export function AlertaToastListener() {
  const push = useToastStore((s) => s.push)
  // Evita re-disparar toast caso o realtime envie o mesmo ID 2x (ex. reconexão)
  const vistosRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (IS_DEMO_MODE) return

    const supabase = createClient()

    const unsubscribe = subscribeTable('alertas', async (payload) => {
      // Filtramos manualmente: só queremos INSERTs
      if (payload.eventType !== 'INSERT') return
      const novo = payload.new as unknown as AlertaRow
      if (!novo?.id) return
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
    })

    return unsubscribe
  }, [push])

  return null
}
