'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Send, MessageCircle, Mail, Link2 } from 'lucide-react'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface EnvioRow {
  id: string
  paciente_id: string
  escala_codigo: string
  tipo: 'prom' | 'prem'
  prem_codigo: string | null
  protocolo_codigo: string | null
  token: string
  enviado_em: string
  canal: 'whatsapp' | 'email' | 'link'
  destino: string | null
  respondido_em: string | null
  status: 'pendente' | 'enviado' | 'aberto' | 'respondido' | 'expirado'
  data_expiracao: string
  score: number | null
  classificacao: string | null
  paciente?: { nome: string; matricula: string }
}

const STATUS_BADGE: Record<EnvioRow['status'], { label: string; className: string }> = {
  pendente:   { label: 'Pendente',   className: 'bg-slate-100 text-slate-700 border-slate-200' },
  enviado:    { label: 'Enviado',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
  aberto:     { label: 'Visualizado',className: 'bg-amber-100 text-amber-700 border-amber-200' },
  respondido: { label: 'Respondido', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  expirado:   { label: 'Expirado',   className: 'bg-red-100 text-red-700 border-red-200' },
}

const CANAL_ICON = {
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
  email:    <Mail className="h-3.5 w-3.5" />,
  link:     <Link2 className="h-3.5 w-3.5" />,
}

export default function EnviosPage() {
  const [envios, setEnvios] = useState<EnvioRow[]>([])
  const [filtro, setFiltro] = useState<'todos' | EnvioRow['status']>('todos')
  const [carregando, setCarregando] = useState(() => !IS_DEMO_MODE)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEMO_MODE) return

    const supabase = createClient()
    let cancelado = false

    async function fetchEnvios() {
      const { data, error } = await supabase
        .from('envios_escalas')
        .select('*, paciente:pacientes(nome, matricula)')
        .order('enviado_em', { ascending: false })
        .limit(100)
      if (cancelado) return
      if (error) { setErro(error.message); setCarregando(false); return }
      setEnvios((data ?? []) as EnvioRow[])
      setCarregando(false)
    }

    fetchEnvios()

    const ch = supabase.channel('envios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envios_escalas' }, fetchEnvios)
      .subscribe()

    return () => { cancelado = true; supabase.removeChannel(ch) }
  }, [])

  const filtrados = useMemo(
    () => filtro === 'todos' ? envios : envios.filter(e => e.status === filtro),
    [envios, filtro],
  )

  const contagem = useMemo(() => {
    const c: Record<EnvioRow['status'] | 'todos', number> = {
      todos: envios.length,
      pendente: 0, enviado: 0, aberto: 0, respondido: 0, expirado: 0,
    }
    for (const e of envios) c[e.status]++
    return c
  }, [envios])

  function copiarLink(token: string) {
    const url = `${window.location.origin}/escala/${token}`
    navigator.clipboard.writeText(url).catch(() => { /* ignore */ })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Envios de Escalas</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Histórico de PROMs e PREMs enviados aos pacientes para preenchimento remoto.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {(['todos','pendente','enviado','aberto','respondido','expirado'] as const).map(st => (
          <button
            key={st}
            onClick={() => setFiltro(st)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filtro === st
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {st === 'todos' ? 'Todos' : STATUS_BADGE[st].label} <span className="ml-1 text-[10px] text-slate-400 num-tabular">{contagem[st]}</span>
          </button>
        ))}
      </div>

      {erro && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          Carregando…
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <Send className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">Nenhum envio {filtro !== 'todos' ? `com status "${STATUS_BADGE[filtro].label}"` : ''} ainda.</p>
          <p className="mt-1 text-xs text-slate-400">
            Use o botão <span className="font-semibold">Enviar para paciente</span> em uma escala para começar.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Paciente</th>
                  <th className="px-4 py-3 text-left">Escala</th>
                  <th className="px-4 py-3 text-left">Canal</th>
                  <th className="px-4 py-3 text-left">Enviado</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Score</th>
                  <th className="px-4 py-3 text-right pr-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(e => {
                  const badge = STATUS_BADGE[e.status]
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-700">{e.paciente?.nome ?? '—'}</div>
                        <div className="text-xs text-slate-400">{e.paciente?.matricula ?? ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-slate-700">{e.escala_codigo}</div>
                        <div className="text-[10px] uppercase text-slate-400">{e.tipo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          {CANAL_ICON[e.canal]}
                          {e.canal}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 num-tabular">
                        {new Date(e.enviado_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', badge.className)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {e.score !== null ? (
                          <span>
                            <span className="font-bold">{e.score}</span>
                            {e.classificacao && <span className="ml-1 text-slate-400">· {e.classificacao}</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 pr-5 text-right">
                        <button
                          onClick={() => copiarLink(e.token)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          title="Copiar link"
                        >
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
