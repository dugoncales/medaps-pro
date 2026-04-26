'use client'

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea,
} from 'recharts'
import type { Consulta } from '@/types'

// ─── Normalizador ────────────────────────────────────────────────────────────
//
// O JSONB `escalas` da tabela consultas pode conter:
//   - número direto (formato legado): { phq9: 16, gad7: 14 }
//   - resultado estruturado (novo):   { PHQ9: { score, classificacao, alertas, ... } }
//
// extrairScore lida com ambos.

type EscalaKey = 'PHQ9' | 'GAD7' | 'EQ5D5L'

function extrairScore(escalas: Record<string, unknown> | undefined, codigo: EscalaKey): number | null {
  if (!escalas) return null

  // Formato novo (resultado estruturado)
  const novo = escalas[codigo] as { score?: number } | undefined
  if (novo && typeof novo.score === 'number') return novo.score

  // Formato legado (número direto)
  const legadoKeys: Record<EscalaKey, string[]> = {
    PHQ9: ['phq9'],
    GAD7: ['gad7'],
    EQ5D5L: ['eq5d_eva', 'eq5d'],
  }
  for (const k of legadoKeys[codigo]) {
    const v = escalas[k]
    if (typeof v === 'number') return v
  }

  return null
}

interface EvolucaoPROMsProps {
  consultas: Consulta[]
  className?: string
}

interface PontoGrafico {
  data: string
  dataObj: Date
  PHQ9?: number
  GAD7?: number
  EQ5D_EVA?: number
}

export function EvolucaoPROMs({ consultas, className }: EvolucaoPROMsProps) {
  const dados = useMemo(() => {
    const pontos: PontoGrafico[] = []
    for (const c of consultas) {
      const phq9 = extrairScore(c.escalas, 'PHQ9')
      const gad7 = extrairScore(c.escalas, 'GAD7')
      const eq5d = extrairScore(c.escalas, 'EQ5D5L')
      if (phq9 === null && gad7 === null && eq5d === null) continue
      const d = new Date(c.data_consulta)
      pontos.push({
        data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }),
        dataObj: d,
        PHQ9: phq9 ?? undefined,
        GAD7: gad7 ?? undefined,
        EQ5D_EVA: eq5d ?? undefined,
      })
    }
    return pontos.sort((a, b) => a.dataObj.getTime() - b.dataObj.getTime())
  }, [consultas])

  if (dados.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className ?? ''}`}>
        <h3 className="font-semibold text-slate-700 mb-2">📈 Evolução de PROMs</h3>
        <p className="py-8 text-center text-sm text-slate-400">
          Nenhuma escala registrada ainda. Aplique PHQ-9, GAD-7 ou EQ-5D-5L durante as consultas.
        </p>
      </div>
    )
  }

  const temPHQ = dados.some((d) => d.PHQ9 !== undefined)
  const temGAD = dados.some((d) => d.GAD7 !== undefined)
  const temEQ5D = dados.some((d) => d.EQ5D_EVA !== undefined)

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-1">📈 Evolução de PROMs ICHOM</h3>
        <p className="text-xs text-slate-500 mb-4">
          Escores de saúde mental (PHQ-9, GAD-7) e qualidade de vida (EQ-5D EVA) ao longo do tempo.
        </p>

        {(temPHQ || temGAD) && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Saúde Mental</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dados} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 27]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />

                {/* Faixas de gravidade PHQ-9 */}
                <ReferenceArea y1={0} y2={9} fill="#10b981" fillOpacity={0.04} />
                <ReferenceArea y1={10} y2={19} fill="#f59e0b" fillOpacity={0.06} />
                <ReferenceArea y1={20} y2={27} fill="#ef4444" fillOpacity={0.06} />

                {temPHQ && (
                  <Line
                    type="monotone"
                    dataKey="PHQ9"
                    stroke="#7C3AED"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="PHQ-9 (depressão)"
                    connectNulls
                  />
                )}
                {temGAD && (
                  <Line
                    type="monotone"
                    dataKey="GAD7"
                    stroke="#0EA5E9"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="GAD-7 (ansiedade)"
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-200" /> Mín–Leve</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-200" /> Moderada</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-200" /> Grave</span>
            </div>
          </div>
        )}

        {temEQ5D && (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Qualidade de Vida</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dados} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="EQ5D_EVA"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="EQ-5D-5L EVA (0–100)"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
