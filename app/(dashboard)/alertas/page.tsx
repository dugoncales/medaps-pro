'use client'

import { useState } from 'react'
import { demoAlertas } from '@/lib/demo-data'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { AlertaItem } from '@/components/shared/AlertaItem'
import type { Alerta } from '@/types'
import { prioridadeToUI } from '@/types'
import Link from 'next/link'

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>(demoAlertas)

  function resolver(id: string) {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, resolvido: true } : a))
  }

  const ativos = alertas.filter(a => !a.resolvido)
  const urgentes = ativos.filter(a => prioridadeToUI(a.prioridade) === 'urgente')
  const atencao = ativos.filter(a => prioridadeToUI(a.prioridade) === 'atencao')
  const informativos = ativos.filter(a => prioridadeToUI(a.prioridade) === 'informativo')

  // Top 20 rastreamentos vencidos (exames atrasados)
  const rastreamentosVencidos = ativos
    .filter(a => a.tipo === 'exame_atrasado' || a.tipo === 'retorno_vencido')
    .sort((a, b) => b.dias_atraso - a.dias_atraso)
    .slice(0, 20)

  return (
    <div className="space-y-6">
      {/* Contadores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{urgentes.length}</p>
          <p className="text-sm font-semibold text-red-700 mt-1">🚨 Urgente</p>
          <p className="text-xs text-red-500 mt-0.5">Ação imediata necessária</p>
        </div>
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{atencao.length}</p>
          <p className="text-sm font-semibold text-amber-700 mt-1">⚠️ Atenção</p>
          <p className="text-xs text-amber-500 mt-0.5">Resolver em até 7 dias</p>
        </div>
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{informativos.length}</p>
          <p className="text-sm font-semibold text-emerald-700 mt-1">ℹ️ Informativo</p>
          <p className="text-xs text-emerald-500 mt-0.5">Monitorar</p>
        </div>
      </div>

      {/* Colunas Kanban */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Urgente */}
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <h2 className="mb-3 font-bold text-red-700">🚨 Urgente ({urgentes.length})</h2>
          <div className="space-y-2">
            {urgentes.length === 0 && (
              <p className="text-sm text-red-400 text-center py-4">Nenhum alerta urgente. ✅</p>
            )}
            {urgentes.map(a => (
              <AlertaItem key={a.id} alerta={a} onResolver={resolver} />
            ))}
          </div>
        </div>

        {/* Atenção */}
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-3 font-bold text-amber-700">⚠️ Atenção ({atencao.length})</h2>
          <div className="space-y-2">
            {atencao.length === 0 && (
              <p className="text-sm text-amber-400 text-center py-4">Nenhum alerta de atenção.</p>
            )}
            {atencao.map(a => (
              <AlertaItem key={a.id} alerta={a} onResolver={resolver} />
            ))}
          </div>
        </div>

        {/* Informativo */}
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
          <h2 className="mb-3 font-bold text-emerald-700">ℹ️ Informativo ({informativos.length})</h2>
          <div className="space-y-2">
            {informativos.length === 0 && (
              <p className="text-sm text-emerald-400 text-center py-4">Nenhum informativo.</p>
            )}
            {informativos.map(a => (
              <AlertaItem key={a.id} alerta={a} onResolver={resolver} />
            ))}
          </div>
        </div>
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
                    Nenhum rastreamento vencido. ✅
                  </td>
                </tr>
              )}
              {rastreamentosVencidos.map(a => {
                const prot = PROTOCOLO_MAP.get(a.protocolo_codigo)
                const prio = prioridadeToUI(a.prioridade)
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.paciente?.nome}</div>
                      <div className="text-xs text-slate-400">{a.paciente?.matricula}</div>
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
                      <span className={`font-bold text-sm ${
                        a.dias_atraso >= 30 ? 'text-red-600' :
                        a.dias_atraso >= 14 ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        {a.dias_atraso}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        prio === 'urgente' ? 'bg-red-100 text-red-700' :
                        prio === 'atencao' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {prio}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => resolver(a.id)}
                        className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                      >
                        Resolver
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
