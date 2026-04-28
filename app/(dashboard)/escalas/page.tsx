'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { IS_DEMO_MODE, demoConsultas } from '@/lib/demo-data'
import { createClient } from '@/lib/supabase/client'
import { useRuntimeStore } from '@/lib/store/runtime-store'
import { ESCALAS, type EscalaCodigo } from '@/lib/escalas/ichom'
import {
  PREMS_DEFINICOES,
  calcularNpsAgregado,
  calcularMediasPorDimensao,
  type PremCodigo,
  type RegistroPREM,
} from '@/lib/escalas/prems'
import { cn } from '@/lib/utils'

interface RegistroPROM {
  codigo: EscalaCodigo
  score: number
  classificacao: string
  data: Date
}

function escalaToRegistro(codigo: EscalaCodigo, score: number, dataIso: string): RegistroPROM | null {
  const def = ESCALAS[codigo]
  if (!def) return null
  return { codigo, score, classificacao: def.classificar(score, {}), data: new Date(dataIso) }
}

export default function EscalasPage() {
  const aplicacoes = useRuntimeStore(s => s.escalas)

  // PROMs derivados de runtime store + consultas demo (sempre disponíveis)
  const promsLocais = useMemo<RegistroPROM[]>(() => {
    const out: RegistroPROM[] = []
    for (const ap of aplicacoes) {
      out.push({
        codigo: ap.codigo,
        score: ap.resultado.score,
        classificacao: ap.resultado.classificacao,
        data: new Date(ap.data),
      })
    }
    if (IS_DEMO_MODE) {
      for (const c of demoConsultas) {
        for (const [k, v] of Object.entries(c.escalas ?? {})) {
          if (typeof v !== 'number') continue
          const codigo = k.toUpperCase() as EscalaCodigo
          const reg = escalaToRegistro(codigo, v, c.data_consulta)
          if (reg) out.push(reg)
        }
      }
    }
    return out
  }, [aplicacoes])

  const [promsServidor, setPromsServidor] = useState<RegistroPROM[]>([])
  const [prems, setPrems] = useState<RegistroPREM[]>([])

  useEffect(() => {
    if (IS_DEMO_MODE) return
    const supabase = createClient()
    let cancelado = false

    async function fetchTudo() {
      const [consRes, premsRes] = await Promise.all([
        supabase.from('consultas').select('id, data_consulta, escalas').limit(500),
        supabase.from('prems_aplicados').select('*').order('data_aplicacao', { ascending: false }).limit(500),
      ])

      if (cancelado) return

      const cons = (consRes.data ?? []) as { id: string; data_consulta: string; escalas: Record<string, unknown> }[]
      const out: RegistroPROM[] = []
      for (const c of cons) {
        for (const [k, v] of Object.entries(c.escalas ?? {})) {
          if (typeof v !== 'number') continue
          const codigo = k.toUpperCase() as EscalaCodigo
          const reg = escalaToRegistro(codigo, v, c.data_consulta)
          if (reg) out.push(reg)
        }
      }
      setPromsServidor(out)
      setPrems((premsRes.data ?? []) as RegistroPREM[])
    }

    fetchTudo()
    return () => { cancelado = true }
  }, [])

  const proms = useMemo(() => [...promsLocais, ...promsServidor], [promsLocais, promsServidor])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Escalas Clínicas</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          PROMs (resultados clínicos relatados) e PREMs (experiência do paciente).
        </p>
      </div>

      <Tabs defaultValue="proms" className="w-full">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="proms">📊 PROMs ({proms.length})</TabsTrigger>
          <TabsTrigger value="prems">📣 PREMs ({prems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="proms" className="mt-4">
          <PROMsView registros={proms} />
        </TabsContent>

        <TabsContent value="prems" className="mt-4">
          <PREMsView registros={prems} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── PROMs ───────────────────────────────────────────────────────────────────

function PROMsView({ registros }: { registros: RegistroPROM[] }) {
  if (registros.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">Nenhum PROM registrado ainda.</p>
        <p className="text-xs text-slate-400 mt-1">
          Aplique uma escala em uma consulta ou envie remotamente para um paciente.
        </p>
      </div>
    )
  }

  // Agrupar por código
  const porCodigo = new Map<EscalaCodigo, RegistroPROM[]>()
  for (const r of registros) {
    const arr = porCodigo.get(r.codigo) ?? []
    arr.push(r)
    porCodigo.set(r.codigo, arr)
  }

  const cards = Array.from(porCodigo.entries()).map(([codigo, regs]) => {
    const ord = regs.sort((a, b) => b.data.getTime() - a.data.getTime())
    return { codigo, ultima: ord[0], total: regs.length }
  })

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ codigo, ultima, total }) => {
        const def = ESCALAS[codigo]
        return (
          <div key={codigo} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{def.nome}</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{ultima.score}<span className="text-xs text-slate-400"> / {def.scoreRange[1]}</span></p>
            <p className="text-xs text-slate-600">{ultima.classificacao}</p>
            <p className="mt-2 text-[11px] text-slate-400">
              {total} aplicação{total > 1 ? 'ões' : ''} · última {ultima.data.toLocaleDateString('pt-BR')}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─── PREMs ───────────────────────────────────────────────────────────────────

function PREMsView({ registros }: { registros: RegistroPREM[] }) {
  const [filtroCodigo, setFiltroCodigo] = useState<PremCodigo>('GLOBAL')

  const npsAgregado = useMemo(() => calcularNpsAgregado(registros), [registros])
  const dimensoes = useMemo(
    () => calcularMediasPorDimensao(registros, filtroCodigo),
    [registros, filtroCodigo],
  )

  if (registros.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">Nenhum PREM registrado ainda.</p>
        <p className="text-xs text-slate-400 mt-1">
          Configure aplicações de PREM-Global ao final das consultas, ou envie remotamente.
        </p>
      </div>
    )
  }

  // Tendência mensal NPS
  const sparkline = npsAgregado.sparkline.map((v, i) => ({
    mes: new Date(new Date().getFullYear(), new Date().getMonth() - (5 - i), 1)
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    nps: v,
  }))

  return (
    <div className="space-y-4">
      {/* NPS Card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">NPS Atual</p>
          <p className={cn(
            'mt-2 text-5xl font-bold',
            npsAgregado.atual >= 50 ? 'text-emerald-600' :
            npsAgregado.atual >= 0 ? 'text-amber-600' : 'text-red-600',
          )}>
            {npsAgregado.atual}
          </p>
          {npsAgregado.delta !== null && (
            <p className={cn(
              'mt-1 text-xs font-semibold',
              npsAgregado.delta > 0 ? 'text-emerald-600' :
              npsAgregado.delta < 0 ? 'text-red-600' : 'text-slate-500',
            )}>
              {npsAgregado.delta > 0 ? '▲' : npsAgregado.delta < 0 ? '▼' : '='} {Math.abs(npsAgregado.delta)} vs. mês anterior
            </p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div>
              <p className="font-bold text-emerald-600">{npsAgregado.promotores}</p>
              <p className="text-slate-500">Promotores</p>
            </div>
            <div>
              <p className="font-bold text-amber-600">{npsAgregado.neutros}</p>
              <p className="text-slate-500">Neutros</p>
            </div>
            <div>
              <p className="font-bold text-red-600">{npsAgregado.detratores}</p>
              <p className="text-slate-500">Detratores</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tendência NPS — últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={sparkline} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis domain={[-100, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="nps" stroke="#2563eb" strokeWidth={2.5} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtro tipo PREM + médias por dimensão */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-700">Médias por dimensão</p>
          <div className="ml-auto flex gap-1">
            {(Object.keys(PREMS_DEFINICOES) as PremCodigo[]).map(cod => (
              <button
                key={cod}
                onClick={() => setFiltroCodigo(cod)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  filtroCodigo === cod
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {PREMS_DEFINICOES[cod].nome}
              </button>
            ))}
          </div>
        </div>

        {dimensoes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            Sem respostas para essa dimensão ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {dimensoes.map(d => (
              <div key={d.pergunta_id} className="grid grid-cols-12 items-center gap-3">
                <p className="col-span-7 text-xs text-slate-700 truncate">{d.texto}</p>
                <div className="col-span-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full',
                      d.media >= 4.2 ? 'bg-emerald-500' : d.media >= 3.5 ? 'bg-amber-500' : 'bg-red-500',
                    )}
                    style={{ width: `${(d.media / 5) * 100}%` }}
                  />
                </div>
                <p className="col-span-1 text-right text-xs font-bold text-slate-700 num-tabular">{d.media.toFixed(1)}</p>
                <p className="col-span-1 text-right text-[10px] text-slate-400 num-tabular">n={d.total_respostas}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
