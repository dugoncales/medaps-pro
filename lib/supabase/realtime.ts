'use client'

// Supabase Realtime — singleton compartilhado.
//
// Motivação: a API `.channel(name).on(...).on(...).subscribe()` do Supabase
// só aceita `.on('postgres_changes', ...)` ANTES do `.subscribe()`. Tentar
// adicionar callbacks depois lança "cannot add postgres_changes callbacks
// for realtime:<name>". Quando vários componentes tentam abrir canais em
// paralelo (ex.: Sidebar+Dashboard+Listener), as chances de colisão e de
// reconexões cruzadas sobem.
//
// Solução: um único canal por sessão de browser, com listeners eager para
// todas as tabelas relevantes. Componentes apenas registram callbacks num
// fanout local — sem criar canais novos. Isso elimina toda a classe de
// erros "duplicate channel".

import { createClient } from './client'
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'

export type RealtimeTable =
  | 'pacientes'
  | 'alertas'
  | 'linhas_cuidado'
  | 'consultas'
  | 'agendamentos'
  | 'envios_escalas'
  | 'prems_aplicados'
  | 'proms_aplicados'

const TABLES: RealtimeTable[] = [
  'pacientes',
  'alertas',
  'linhas_cuidado',
  'consultas',
  'agendamentos',
  'envios_escalas',
  'prems_aplicados',
  'proms_aplicados',
]

type AnyPayload = RealtimePostgresChangesPayload<Record<string, unknown>>
type Callback = (payload: AnyPayload) => void

// Sets de callbacks por tabela
const subs = new Map<RealtimeTable, Set<Callback>>()
for (const t of TABLES) subs.set(t, new Set())

let channel: RealtimeChannel | null = null
let initStarted = false

function fanout(table: RealtimeTable, payload: AnyPayload) {
  const set = subs.get(table)
  if (!set) return
  for (const cb of set) {
    try { cb(payload) }
    catch (err) { console.error('[realtime] callback error:', err) }
  }
}

function ensureChannel(): RealtimeChannel | null {
  if (typeof window === 'undefined') return null
  if (channel) return channel
  if (initStarted) return null // já em construção (caso raro)
  initStarted = true

  const supabase = createClient()
  const name = `app-realtime-${
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  }`

  // Encadeia .on() para todas as tabelas ANTES do .subscribe()
  let c = supabase.channel(name)
  for (const t of TABLES) {
    c = c.on(
      // O TS do supabase-js tipa o overload exatamente assim:
      'postgres_changes' as never,
      { event: '*', schema: 'public', table: t } as never,
      (payload: AnyPayload) => fanout(t, payload),
    )
  }

  c.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      // pronto
    } else if (status === 'CHANNEL_ERROR') {
      console.error('[realtime] CHANNEL_ERROR — tentando recuperar')
    } else if (status === 'TIMED_OUT') {
      console.warn('[realtime] timeout, reconectando…')
    } else if (status === 'CLOSED') {
      // permite reabrir quando chamado de novo
      channel = null
      initStarted = false
    }
  })

  channel = c
  return channel
}

/**
 * Inscreve um callback em mudanças (event '*') de uma tabela.
 * Retorna função para cancelar a inscrição.
 *
 * Use dentro de useEffect com array de deps vazio:
 *
 *   useEffect(() => {
 *     const u = subscribeTable('alertas', () => fetchTudo())
 *     return u
 *   }, [])
 */
export function subscribeTable(
  table: RealtimeTable,
  callback: Callback,
): () => void {
  ensureChannel()
  const set = subs.get(table)
  if (!set) return () => {}
  set.add(callback)
  return () => { set.delete(callback) }
}

/** Inscreve em múltiplas tabelas com o mesmo callback */
export function subscribeTables(
  tables: RealtimeTable[],
  callback: Callback,
): () => void {
  const unsubs = tables.map(t => subscribeTable(t, callback))
  return () => { for (const u of unsubs) u() }
}
