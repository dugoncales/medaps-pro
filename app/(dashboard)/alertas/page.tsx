'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IS_DEMO_MODE, demoAlertas } from '@/lib/demo-data'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { AlertaItem } from '@/components/shared/AlertaItem'
import { createClient } from '@/lib/supabase/client'
import { subscribeTable } from '@/lib/supabase/realtime'
import { useToastStore } from '@/lib/store/toast-store'
import {
  destinoParaAlerta,
  rotaParaAlerta,
} from '@/lib/alertas/route-resolver'
import type { Alerta } from '@/types'
import { prioridadeToUI } from '@/types'

export default function AlertasPage() {
  const router = useRouter()
  const pushToast = useToastStore((s) => s.push)

  const [alertas, setAlertas] = useState<Alerta[]>(IS_DEMO_MODE ? demoAlertas : [])
  const [carregando, setCarregando] = useState<boolean>(() => !IS_DEMO_MODE)
  const [erro, setErro] = useState<string | null>(null)

  // ─── Fetch real + realtime ─────────────────────────────────────────────────
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelado = false
    const supabase = createClient()

    async function fetchAlertas() {
      try {
        // RLS já restringe pela empresa do profissional logado.
        const { data, error } = await supabase
          .from('alertas')
          .select('*, paciente:pacientes(nome, matricula)')
          .eq('resolvido', false)
          .order('created_at', { ascending: false })
        if (error) throw error
        if (!cancelado) {
          const lista = Array.isArray(data) ? (data as Alerta[]) : []
          setAlertas(lista)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao carregar alertas'
        if (!cancelado) setErro(msg)
        console.error('[alertas] fetch:', e)
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    fetchAlertas()
    const unsubscribe = subscribeTable('alertas', () => {
      if (!cancelado) fetchAlertas()
    })

    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [])

  // ─── Resolver com persistência + Desfazer ──────────────────────────────────
  async function persistirResolvido(id: string, valor: boolean) {
    if (IS_DEMO_MODE) return
    const supabase = createClient()
    const { error } = await supabase
      .from('alertas')
      .update({
        resolvido: valor,
        resolved_at: valor ? new Date().toISOString() : null,
      })
      .eq('id', id)
    if (error) {
      console.error('[alertas] update:', error)
      throw error
    }
  }

  async function desfazerResolver(alerta: Alerta) {
    // Reverte: marca não resolvido novamente e devolve à lista
    setAlertas((prev) => (prev.find((a) => a.id === alerta.id) ? prev : [{ ...alerta, resolvido: false }, ...prev]))
    try {
      await persistirResolvido(alerta.id, false)
      pushToast({
        tipo: 'info',
        titulo: 'Resolução desfeita',
        descricao: `O alerta de ${alerta.paciente?.nome ?? 'paciente'} voltou para a lista.`,
      })
    } catch {
      // se o rollback falhar, removemos novamente
      setAlertas((prev) => prev.filter((a) => a.id !== alerta.id))
      pushToast({
        tipo: 'critico',
        titulo: 'Não foi possível desfazer',
        descricao: 'Tente novamente em instantes.',
      })
    }
  }

  function resolverEDirecionar(alerta: Alerta) {
    const destino = destinoParaAlerta(alerta.tipo)
    const rota = rotaParaAlerta(alerta.paciente_id, alerta.tipo)

    // Otimista: tira da lista
    setAlertas((prev) => prev.filter((a) => a.id !== alerta.id))

    // Redireciona
    router.push(rota)

    // Persiste em background
    persistirResolvido(alerta.id, true)
      .then(() => {
        pushToast({
          tipo: 'sucesso',
          titulo: 'Alerta resolvido',
          descricao: `${alerta.paciente?.nome ?? 'Paciente'} — ${destino.rotuloAcao.replace(/\s*→\s*$/, '')}`,
          duracao: 8000,
          acao: { label: 'Desfazer', onClick: () => desfazerResolver(alerta) },
        })
      })
      .catch(() => {
        // rollback otimista — devolve à lista
        setAlertas((prev) => (prev.find((a) => a.id === alerta.id) ? prev : [alerta, ...prev]))
        pushToast({
          tipo: 'critico',
          titulo: 'Não foi possível resolver',
          descricao: 'O alerta voltou para a lista. Tente novamente.',
        })
      })
  }

  // ─── Derivados ─────────────────────────────────────────────────────────────
  const ativos = useMemo(() => (alertas ?? []).filter((a) => !a?.resolvido), [alertas])
  const urgentes = useMemo(() => ativos.filter((a) => prioridadeToUI(a.prioridade) === 'urgente'), [ativos])
  const atencao = useMemo(() => ativos.filter((a) => prioridadeToUI(a.prioridade) === 'atencao'), [ativos])
  const informativos = useMemo(() => ativos.filter((a) => prioridadeToUI(a.prioridade) === 'informativo'), [ativos])

  const rastreamentosVencidos = useMemo(
    () =>
      ativos
        .filter((a) => a.tipo === 'exame_atrasado' || a.tipo === 'retorno_vencido')
        .sort((a, b) => (b.dias_atraso ?? 0) - (a.dias_atraso ?? 0))
        .slice(0, 20),
    [ativos],
  )

  return (
    <div className="space-y-6">
      {/* Banner erro */}
      {erro && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ⚠️ {erro} — exibindo último estado conhecido.
        </div>
      )}

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-red-600 num-tabular">{urgentes.length}</p>
          <p className="text-xs sm:text-sm font-semibold text-red-700 mt-1">🚨 Urgente</p>
          <p className="hidden sm:block text-xs text-red-500 mt-0.5">Ação imediata necessária</p>
        </div>
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-amber-600 num-tabular">{atencao.length}</p>
          <p className="text-xs sm:text-sm font-semibold text-amber-700 mt-1">⚠️ Atenção</p>
          <p className="hidden sm:block text-xs text-amber-500 mt-0.5">Resolver em até 7 dias</p>
        </div>
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 num-tabular">{informativos.length}</p>
          <p className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">ℹ️ Informativo</p>
          <p className="hidden sm:block text-xs text-emerald-500 mt-0.5">Monitorar</p>
        </div>
      </div>

      {/* Colunas Kanban */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ColunaAlertas
          titulo="🚨 Urgente"
          cor="red"
          alertas={urgentes}
          carregando={carregando}
          vazioMsg="Nenhum alerta urgente. ✅"
          onResolver={resolverEDirecionar}
        />
        <ColunaAlertas
          titulo="⚠️ Atenção"
          cor="amber"
          alertas={atencao}
          carregando={carregando}
          vazioMsg="Nenhum alerta de atenção."
          onResolver={resolverEDirecionar}
        />
        <ColunaAlertas
          titulo="ℹ️ Informativo"
          cor="emerald"
          alertas={informativos}
          carregando={carregando}
          vazioMsg="Nenhum informativo."
          onResolver={resolverEDirecionar}
        />
      </div>

      {/* Rastreamentos vencidos — Top 20 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">📋 Rastreamentos Vencidos — Top 20</h2>
          <p className="text-xs text-slate-400 mt-0.5">Retornos e exames em atraso, ordenados por dias de atraso.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3 text-left">Paciente</th>
                <th className="px-4 py-3 text-left">Protocolo</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Vencimento</th>
                <th className="px-4 py-3 text-left">Dias atraso</th>
                <th className="px-4 py-3 text-left">Prioridade</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rastreamentosVencidos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    {carregando ? 'Carregando…' : 'Nenhum rastreamento vencido. ✅'}
                  </td>
                </tr>
              )}
              {rastreamentosVencidos.map((a) => {
                const prot = PROTOCOLO_MAP.get(a.protocolo_codigo)
                const prio = prioridadeToUI(a.prioridade)
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.paciente?.nome ?? '—'}</div>
                      <div className="text-xs text-slate-400">{a.paciente?.matricula ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: prot?.cor ?? '#6b7280' }}
                      >
                        {a.protocolo_codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {a.tipo === 'retorno_vencido' ? 'Retorno' : 'Exame'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {a.data_vencimento ? new Date(a.data_vencimento).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold text-sm num-tabular ${
                          (a.dias_atraso ?? 0) >= 30
                            ? 'text-red-600'
                            : (a.dias_atraso ?? 0) >= 14
                              ? 'text-amber-600'
                              : 'text-slate-600'
                        }`}
                      >
                        {a.dias_atraso ?? 0}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          prio === 'urgente'
                            ? 'bg-red-100 text-red-700'
                            : prio === 'atencao'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {prio}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => resolverEDirecionar(a)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                      >
                        {destinoParaAlerta(a.tipo).rotuloAcao}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Coluna Kanban ───────────────────────────────────────────────────────────

interface ColunaProps {
  titulo: string
  cor: 'red' | 'amber' | 'emerald'
  alertas: Alerta[]
  carregando: boolean
  vazioMsg: string
  onResolver: (alerta: Alerta) => void
}

function ColunaAlertas({ titulo, cor, alertas, carregando, vazioMsg, onResolver }: ColunaProps) {
  const styles = {
    red:     { bg: 'bg-red-50',     border: 'border-red-200',     title: 'text-red-700',     muted: 'text-red-400' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   title: 'text-amber-700',   muted: 'text-amber-400' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-700', muted: 'text-emerald-400' },
  }[cor]

  return (
    <div className={`rounded-xl border-2 ${styles.border} ${styles.bg} p-4`}>
      <h2 className={`mb-3 font-bold ${styles.title}`}>
        {titulo} ({alertas.length})
      </h2>
      <div className="space-y-2">
        {carregando ? (
          <p className={`text-sm ${styles.muted} text-center py-4 animate-pulse`}>Carregando…</p>
        ) : alertas.length === 0 ? (
          <p className={`text-sm ${styles.muted} text-center py-4`}>{vazioMsg}</p>
        ) : (
          alertas.map((a) => (
            <AlertaItem
              key={a.id}
              alerta={a}
              onResolver={onResolver}
              resolverLabel={destinoParaAlerta(a.tipo).rotuloAcao}
            />
          ))
        )}
      </div>
    </div>
  )
}
