'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  ESCALAS, ESCALAS_LIST,
  type DefinicaoEscala, type EscalaCodigo,
} from '@/lib/escalas/ichom'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

interface PromAplicadoRow {
  id: string
  codigo: string
  score: number | null
  data_aplicacao: string
  paciente_id: string
}

interface EstatisticaEscala {
  codigo: EscalaCodigo
  nome: string
  total: number
  scoreMedio: number | null
  ultimoUso: Date | null
}

const FILTRO_TODOS = '__TODOS__'

export default function EscalasPage() {
  const [filtroProtocolo, setFiltroProtocolo] = useState<string>(FILTRO_TODOS)
  const [busca, setBusca] = useState('')
  const [proms, setProms] = useState<PromAplicadoRow[]>([])
  const [carregando, setCarregando] = useState<boolean>(() => !IS_DEMO_MODE)

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelado = false
    const supabase = createClient()

    async function fetchProms() {
      try {
        // RLS já restringe por empresa do profissional logado.
        const { data, error } = await supabase
          .from('proms_aplicados')
          .select('id, codigo, score, data_aplicacao, paciente_id')
          .order('data_aplicacao', { ascending: false })
          .limit(2000)
        if (error) throw error
        if (!cancelado) setProms((data ?? []) as PromAplicadoRow[])
      } catch (e) {
        console.error('[escalas] fetch proms_aplicados:', e)
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    fetchProms()
    return () => { cancelado = true }
  }, [])

  // ─── Filtro biblioteca ────────────────────────────────────────────────────
  const protocolosDisponiveis = useMemo<string[]>(() => {
    const set = new Set<string>()
    for (const e of ESCALAS_LIST) for (const p of e.protocolosRelacionados) set.add(p)
    return Array.from(set).sort()
  }, [])

  const escalasFiltradas = useMemo<DefinicaoEscala[]>(() => {
    const t = busca.trim().toLowerCase()
    return ESCALAS_LIST.filter(e => {
      if (filtroProtocolo !== FILTRO_TODOS && !e.protocolosRelacionados.includes(filtroProtocolo)) return false
      if (!t) return true
      return (
        e.nome.toLowerCase().includes(t) ||
        e.descricao.toLowerCase().includes(t) ||
        e.codigo.toLowerCase().includes(t)
      )
    })
  }, [filtroProtocolo, busca])

  // ─── Estatísticas ─────────────────────────────────────────────────────────
  const estatisticas = useMemo<EstatisticaEscala[]>(() => {
    const map = new Map<EscalaCodigo, { total: number; soma: number; comScore: number; ultimo: Date | null }>()
    for (const p of proms) {
      const codigo = p.codigo as EscalaCodigo
      if (!ESCALAS[codigo]) continue
      const cur = map.get(codigo) ?? { total: 0, soma: 0, comScore: 0, ultimo: null }
      cur.total += 1
      if (p.score !== null && Number.isFinite(p.score)) {
        cur.soma += Number(p.score)
        cur.comScore += 1
      }
      const d = new Date(p.data_aplicacao)
      if (!Number.isNaN(d.getTime()) && (!cur.ultimo || d > cur.ultimo)) cur.ultimo = d
      map.set(codigo, cur)
    }
    return Array.from(map.entries())
      .map(([codigo, v]) => ({
        codigo,
        nome: ESCALAS[codigo].nome,
        total: v.total,
        scoreMedio: v.comScore > 0 ? v.soma / v.comScore : null,
        ultimoUso: v.ultimo,
      }))
      .sort((a, b) => b.total - a.total)
  }, [proms])

  const totalAplicacoes = proms.length
  const escalaMaisUsada = estatisticas[0] ?? null
  const pacientesUnicos = useMemo(
    () => new Set(proms.map(p => p.paciente_id)).size,
    [proms],
  )
  const semDados = !carregando && totalAplicacoes === 0

  return (
    <div className="space-y-4 font-[Inter]">
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Escalas Clínicas</h1>
        <p className="mt-0.5 text-sm text-[#6B7280]">
          Biblioteca ICHOM (PROMs e PREMs) e estatísticas de uso da empresa.
        </p>
      </div>

      <Tabs defaultValue="biblioteca" className="w-full">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="biblioteca">📚 Biblioteca · {ESCALAS_LIST.length}</TabsTrigger>
          <TabsTrigger value="estatisticas">
            📊 Estatísticas{!carregando && totalAplicacoes > 0 ? ` · ${totalAplicacoes}` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="biblioteca" className="mt-4 space-y-4">
          {semDados && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-900 shadow-sm">
              <span className="font-semibold">Nenhuma escala aplicada ainda.</span>{' '}
              Aplique escalas nos perfis dos pacientes para começar a ver estatísticas de uso.
            </div>
          )}

          <BibliotecaFiltros
            busca={busca}
            setBusca={setBusca}
            filtroProtocolo={filtroProtocolo}
            setFiltroProtocolo={setFiltroProtocolo}
            protocolos={protocolosDisponiveis}
            totalEscalas={ESCALAS_LIST.length}
            totalFiltradas={escalasFiltradas.length}
          />

          {escalasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-slate-500">Nenhuma escala encontrada com esses filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {escalasFiltradas.map(e => <CardEscala key={e.codigo} escala={e} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="estatisticas" className="mt-4 space-y-4">
          <EstatisticasView
            carregando={carregando}
            total={totalAplicacoes}
            escalaMaisUsada={escalaMaisUsada}
            pacientesUnicos={pacientesUnicos}
            estatisticas={estatisticas}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Biblioteca ─────────────────────────────────────────────────────────────

interface BibliotecaFiltrosProps {
  busca: string
  setBusca: (v: string) => void
  filtroProtocolo: string
  setFiltroProtocolo: (v: string) => void
  protocolos: string[]
  totalEscalas: number
  totalFiltradas: number
}

function BibliotecaFiltros({
  busca, setBusca, filtroProtocolo, setFiltroProtocolo,
  protocolos, totalEscalas, totalFiltradas,
}: BibliotecaFiltrosProps) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome, código ou descrição…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="shrink-0 text-xs text-slate-500 num-tabular">
          {totalFiltradas} de {totalEscalas} escalas
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <PillFiltro
          ativo={filtroProtocolo === FILTRO_TODOS}
          cor="#0F172A"
          onClick={() => setFiltroProtocolo(FILTRO_TODOS)}
        >
          Todos protocolos
        </PillFiltro>
        {protocolos.map(cod => {
          const proto = PROTOCOLO_MAP.get(cod)
          return (
            <PillFiltro
              key={cod}
              ativo={filtroProtocolo === cod}
              cor={proto?.cor ?? '#6B7280'}
              onClick={() => setFiltroProtocolo(cod)}
              title={proto?.nome ?? cod}
            >
              <span aria-hidden>{proto?.icone}</span>
              {cod}
            </PillFiltro>
          )
        })}
      </div>
    </div>
  )
}

interface PillFiltroProps {
  ativo: boolean
  cor: string
  onClick: () => void
  children: React.ReactNode
  title?: string
}

function PillFiltro({ ativo, cor, onClick, children, title }: PillFiltroProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
        ativo
          ? 'border-transparent text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
      )}
      style={ativo ? { backgroundColor: cor } : undefined}
    >
      {children}
    </button>
  )
}

function CardEscala({ escala }: { escala: DefinicaoEscala }) {
  return (
    <div className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{escala.nome}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{escala.codigo}</p>
        </div>
        <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 num-tabular">
          {escala.scoreRange[0]}–{escala.scoreRange[1]}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-xs leading-snug text-slate-600">
        {escala.descricao}
      </p>

      <div className="mt-auto flex flex-wrap gap-1">
        {escala.protocolosRelacionados.map(cod => {
          const proto = PROTOCOLO_MAP.get(cod)
          return (
            <span
              key={cod}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: proto?.cor ?? '#6B7280' }}
              title={proto?.nome ?? cod}
            >
              <span aria-hidden>{proto?.icone}</span>
              {cod}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Estatísticas ───────────────────────────────────────────────────────────

interface EstatisticasViewProps {
  carregando: boolean
  total: number
  escalaMaisUsada: EstatisticaEscala | null
  pacientesUnicos: number
  estatisticas: EstatisticaEscala[]
}

function EstatisticasView({
  carregando, total, escalaMaisUsada, pacientesUnicos, estatisticas,
}: EstatisticasViewProps) {
  if (carregando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        Carregando estatísticas…
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Nenhuma escala aplicada ainda</p>
        <p className="mt-1 text-xs text-slate-500">
          Aplique escalas nos perfis dos pacientes para começar a ver estatísticas de uso.
        </p>
      </div>
    )
  }

  const top5 = estatisticas.slice(0, 5).map(e => ({
    nome: e.nome,
    total: e.total,
  }))

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total aplicações" value={String(total)} />
        <Metric
          label="Escala mais usada"
          value={escalaMaisUsada?.nome ?? '—'}
          sub={escalaMaisUsada ? `${escalaMaisUsada.total} aplicações` : undefined}
        />
        <Metric
          label="Pacientes alcançados"
          value={String(pacientesUnicos)}
          sub="com ≥ 1 PROM aplicado"
        />
        <Metric
          label="Diversidade"
          value={`${estatisticas.length} / ${ESCALAS_LIST.length}`}
          sub="escalas distintas em uso"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          Top 5 escalas mais aplicadas
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={top5} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={(v) => [v as number, 'aplicações']}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {top5.map((_, i) => (
                <Cell key={i} fill={['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'][i] ?? '#3B82F6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Ranking de escalas
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-3">Escala</th>
                <th className="pb-2 px-3 text-right">Aplicações</th>
                <th className="pb-2 px-3 text-right">Score médio</th>
                <th className="pb-2 pl-3 text-right">Último uso</th>
              </tr>
            </thead>
            <tbody>
              {estatisticas.map(e => {
                const def = ESCALAS[e.codigo]
                return (
                  <tr key={e.codigo} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-3 align-top">
                      <p className="text-sm font-semibold text-slate-900">{e.nome}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {def.protocolosRelacionados.map(cod => {
                          const proto = PROTOCOLO_MAP.get(cod)
                          return (
                            <span
                              key={cod}
                              className="rounded px-1 py-0.5 text-[9px] font-bold text-white"
                              style={{ backgroundColor: proto?.cor ?? '#6B7280' }}
                              title={proto?.nome ?? cod}
                            >
                              {cod}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-semibold text-slate-900 num-tabular">
                      {e.total}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-slate-700 num-tabular">
                      {e.scoreMedio != null
                        ? `${e.scoreMedio.toFixed(1)} / ${def.scoreRange[1]}`
                        : '—'}
                    </td>
                    <td className="py-3 pl-3 text-right text-xs text-slate-500 num-tabular">
                      {e.ultimoUso ? e.ultimoUso.toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}
