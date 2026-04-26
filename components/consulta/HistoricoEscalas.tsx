'use client'

import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { ModalAplicarEscala } from '@/components/consulta/ModalAplicarEscala'
import { useRuntimeStore, gerarId, type AplicacaoEscala } from '@/lib/store/runtime-store'
import { ESCALAS, type EscalaCodigo, type ResultadoEscala } from '@/lib/escalas/ichom'
import { cn } from '@/lib/utils'
import type { Consulta } from '@/types'

// ─── Normalização ────────────────────────────────────────────────────────────

interface RegistroEscala {
  id: string
  codigo: EscalaCodigo
  score: number
  classificacao: string
  data: Date
  profissional?: string
  consulta_id?: string
}

const LEGACY_KEY_MAP: Record<string, EscalaCodigo> = {
  phq9: 'PHQ9', phq2: 'PHQ2', gad7: 'GAD7',
  hit6: 'HIT6', cat: 'CAT', mmrc: 'MMRC', acq5: 'ACQ5',
  ess: 'ESS', epworth: 'ESS', stopbang: 'STOPBANG',
  auditc: 'AUDITC', audit_c: 'AUDITC', audit: 'AUDIT',
  fagerstrom: 'FAGERSTROM', iief5: 'IIEF5',
  eva_dor: 'EVA_DOR', eva: 'EVA_DOR',
  who5: 'WHO5', epds: 'EPDS', dlqi: 'DLQI',
  eq5d_eva: 'EQ5D5L',
}

function obterRegistros(consultas: Consulta[], aplicacoesStore: AplicacaoEscala[]): RegistroEscala[] {
  const registros: RegistroEscala[] = []

  // Fontes legadas — campo escalas dentro de cada consulta
  for (const c of consultas) {
    if (!c.escalas) continue
    for (const [k, v] of Object.entries(c.escalas)) {
      // Formato novo dentro do JSONB: chave é o codigo (PHQ9, GAD7…)
      if (k in ESCALAS && v && typeof v === 'object' && 'score' in v) {
        const obj = v as ResultadoEscala
        registros.push({
          id: `${c.id}-${k}`,
          codigo: k as EscalaCodigo,
          score: Number(obj.score),
          classificacao: obj.classificacao,
          data: new Date(c.data_consulta),
          consulta_id: c.id,
        })
        continue
      }

      // Formato legado: chave camelcase/lower em LEGACY_KEY_MAP, valor numérico
      const codigo = LEGACY_KEY_MAP[k.toLowerCase()]
      if (!codigo || typeof v !== 'number') continue
      const def = ESCALAS[codigo]
      registros.push({
        id: `${c.id}-${k}`,
        codigo,
        score: v,
        classificacao: def.classificar(v, {}),
        data: new Date(c.data_consulta),
        consulta_id: c.id,
      })
    }
  }

  // Fonte runtime — store com aplicações isoladas
  for (const ap of aplicacoesStore) {
    registros.push({
      id: ap.id,
      codigo: ap.codigo,
      score: ap.resultado.score,
      classificacao: ap.resultado.classificacao,
      data: new Date(ap.data),
      profissional: ap.profissional_nome,
      consulta_id: ap.consulta_id,
    })
  }

  return registros.sort((a, b) => b.data.getTime() - a.data.getTime())
}

// ─── Cores por código ────────────────────────────────────────────────────────

const CORES: Record<EscalaCodigo, string> = {
  PHQ9: '#7C3AED', PHQ2: '#A78BFA', GAD7: '#0EA5E9',
  EQ5D5L: '#10B981', WHO5: '#22C55E', HIT6: '#F97316',
  CAT: '#0891B2', MMRC: '#06B6D4', ACQ5: '#3B82F6',
  ESS: '#F59E0B', STOPBANG: '#EAB308',
  AUDITC: '#DC2626', AUDIT: '#B91C1C',
  FAGERSTROM: '#9333EA', IIEF5: '#2563EB', EVA_DOR: '#EF4444',
  EPDS: '#EC4899', DLQI: '#14B8A6',
}

// ─── Componente principal ────────────────────────────────────────────────────

interface HistoricoEscalasProps {
  pacienteId: string
  pacienteNome: string
  protocolosAtivos: string[]
  consultas: Consulta[]
  profissionalNome: string
}

export function HistoricoEscalas({
  pacienteId, pacienteNome, protocolosAtivos, consultas, profissionalNome,
}: HistoricoEscalasProps) {
  const aplicacoes = useRuntimeStore((s) => s.escalasPorPaciente(pacienteId))
  const adicionarEscala = useRuntimeStore((s) => s.adicionarEscala)

  const [modalAberto, setModalAberto] = useState(false)
  const [escalasOcultas, setEscalasOcultas] = useState<Set<EscalaCodigo>>(new Set())

  const registros = useMemo(
    () => obterRegistros(consultas, aplicacoes),
    [consultas, aplicacoes],
  )

  // Card por código — última aplicação + delta
  const ultimosPorCodigo = useMemo(() => {
    const map = new Map<EscalaCodigo, { ultima: RegistroEscala; anterior?: RegistroEscala }>()
    for (const reg of registros) {
      const atual = map.get(reg.codigo)
      if (!atual) {
        map.set(reg.codigo, { ultima: reg })
      } else if (!atual.anterior && atual.ultima.id !== reg.id) {
        atual.anterior = reg
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.ultima.data.getTime() - a.ultima.data.getTime(),
    )
  }, [registros])

  // Dados do gráfico (chave por data, uma linha por codigo)
  const codigosUsados = useMemo(
    () => Array.from(new Set(registros.map((r) => r.codigo))),
    [registros],
  )

  const dadosGrafico = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>()
    for (const reg of registros) {
      const chave = reg.data.toISOString().slice(0, 10)
      if (!map.has(chave)) {
        map.set(chave, {
          data: reg.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }),
          _ts: reg.data.getTime(),
        })
      }
      map.get(chave)![reg.codigo] = reg.score
    }
    return Array.from(map.values()).sort(
      (a, b) => Number(a._ts) - Number(b._ts),
    )
  }, [registros])

  function handleSubmitEscala(codigo: EscalaCodigo, resultado: ResultadoEscala) {
    adicionarEscala({
      id: gerarId('ap'),
      paciente_id: pacienteId,
      codigo,
      resultado,
      profissional_nome: profissionalNome,
      data: new Date().toISOString(),
    })
    setModalAberto(false)
    if (resultado.alertas.length > 0) {
      console.warn(
        `[HistoricoEscalas] alerta clínico ao registrar ${codigo}:`,
        resultado.alertas,
      )
    }
  }

  function toggleEscalaOculta(codigo: EscalaCodigo) {
    setEscalasOcultas((prev) => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">📊 Escalas ICHOM — {pacienteNome.split(' ')[0]}</h2>
        <Button
          onClick={() => setModalAberto(true)}
          className="bg-blue-600 hover:bg-blue-500 gap-1.5"
        >
          + Aplicar Escala
        </Button>
      </div>

      {/* SEÇÃO 1 — Cards de escalas atuais */}
      {ultimosPorCodigo.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Nenhuma escala aplicada ainda. Clique em <span className="font-semibold text-blue-600">+ Aplicar Escala</span> para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ultimosPorCodigo.map(({ ultima, anterior }) => {
            const def = ESCALAS[ultima.codigo]
            const delta = anterior ? ultima.score - anterior.score : null
            const cor = CORES[ultima.codigo] ?? '#64748b'
            return (
              <div key={ultima.codigo} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cor }}
                      />
                      <span className="text-sm font-bold text-slate-800 truncate">{def.nome}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400 truncate">{def.descricao}</p>
                  </div>
                  {delta !== null && (
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold',
                      delta < 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : delta > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-500',
                    )}>
                      {delta < 0 ? '▼' : delta > 0 ? '▲' : '='} {Math.abs(delta).toFixed(2).replace(/\.?0+$/, '')}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: cor }}>{ultima.score}</span>
                  <span className="text-xs text-slate-400">/ {def.scoreRange[1]}</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{ultima.classificacao}</p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {ultima.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalAberto(true)}
                    className="font-semibold text-blue-600 hover:text-blue-500"
                  >
                    Aplicar agora →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SEÇÃO 2 — Gráfico longitudinal */}
      {registros.length >= 2 && codigosUsados.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-1">Evolução longitudinal</h3>
          <p className="text-xs text-slate-500 mb-3">
            Use os botões abaixo para mostrar/ocultar cada escala no gráfico.
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {codigosUsados.map((c) => {
              const def = ESCALAS[c]
              const oculta = escalasOcultas.has(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleEscalaOculta(c)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors flex items-center gap-1.5',
                    oculta
                      ? 'border-slate-200 bg-white text-slate-400 line-through'
                      : 'border-slate-300 bg-white text-slate-700',
                  )}
                  style={!oculta ? { borderColor: CORES[c], color: CORES[c] } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CORES[c] }} />
                  {def.nome}
                </button>
              )
            })}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dadosGrafico} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {codigosUsados
                .filter((c) => !escalasOcultas.has(c))
                .map((c) => (
                  <Line
                    key={c}
                    type="monotone"
                    dataKey={c}
                    name={ESCALAS[c].nome}
                    stroke={CORES[c]}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* SEÇÃO 3 — Tabela cronológica */}
      {registros.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="font-semibold text-slate-700">Histórico cronológico</h3>
            <p className="text-xs text-slate-400">{registros.length} aplicações registradas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-2.5 text-left">Data</th>
                  <th className="px-4 py-2.5 text-left">Escala</th>
                  <th className="px-4 py-2.5 text-left">Score</th>
                  <th className="px-4 py-2.5 text-left">Classificação</th>
                  <th className="px-4 py-2.5 text-left">Profissional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.map((r) => {
                  const def = ESCALAS[r.codigo]
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600 text-xs whitespace-nowrap">
                        {r.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: CORES[r.codigo] }}
                        >
                          {def.nome}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700">
                        {r.score} <span className="text-xs text-slate-400">/ {def.scoreRange[1]}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{r.classificacao}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{r.profissional ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModalAplicarEscala
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSubmit={handleSubmitEscala}
        protocolosAtivos={protocolosAtivos}
      />
    </div>
  )
}
