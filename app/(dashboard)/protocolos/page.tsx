'use client'

import { useState } from 'react'
import { PROTOCOLOS, type Protocolo } from '@/lib/protocolos'
import { demoLinhas } from '@/lib/demo-data'
import { ProgressoProtocolo } from '@/components/shared/ProgressoProtocolo'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusPill } from '@/components/shared/StatusPill'
import type { StatusControle } from '@/types'

function calcProtocoloStats(codigo: string) {
  const linhas = demoLinhas.filter(l => l.protocolo_codigo === codigo && l.status === 'ativo')
  const controlados = linhas.filter(l => l.nivel_gravidade === 'controlado').length
  const total = linhas.length
  const pct = total ? Math.round((controlados / total) * 100) : 0
  return { total, controlados, pct }
}

export default function ProtocolosPage() {
  const [selecionado, setSelecionado] = useState<Protocolo | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Linha de Cuidado</h1>
        <p className="text-sm text-slate-500">{PROTOCOLOS.length} protocolos clínicos ativos · clique para ver detalhes</p>
      </div>

      {/* Grid de protocolos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PROTOCOLOS.map(protocolo => {
          const { total, pct } = calcProtocoloStats(protocolo.codigo)
          return (
            <button
              key={protocolo.codigo}
              onClick={() => setSelecionado(protocolo)}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: protocolo.cor + '20', border: `2px solid ${protocolo.cor}40` }}>
                  {protocolo.icone}
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: protocolo.cor }}
                >
                  {protocolo.codigo}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-800 leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                {protocolo.nome}
              </h3>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{total} paciente{total !== 1 ? 's' : ''}</span>
                  <span className={`font-semibold ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {pct}% ctrl.
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Modal de detalhes */}
      <Dialog open={!!selecionado} onOpenChange={() => setSelecionado(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-2xl">{selecionado.icone}</span>
                  <div>
                    <span className="text-lg">{selecionado.nome}</span>
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: selecionado.cor }}
                    >
                      {selecionado.codigo}
                    </span>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Critérios de controle */}
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase text-emerald-700 mb-2">🎯 Meta / Critérios de Controle</p>
                  <ul className="space-y-1">
                    {selecionado.criterios_controle.map(c => (
                      <li key={c} className="text-sm text-emerald-800 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Retorno */}
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-2">📅 Intervalo de Retorno</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([['controlado', 'Controlado'], ['parcial', 'Parcial'], ['descontrolado', 'Descontrolado']] as [StatusControle, string][]).map(([k, label]) => (
                      <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                        <StatusPill status={k} size="sm" />
                        <p className="text-lg font-bold text-slate-800 mt-2">{selecionado.retorno_dias[k]}d</p>
                        <p className="text-xs text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escalas */}
                {selecionado.escalas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-2">📊 Escalas de Monitoramento</p>
                    <div className="flex flex-wrap gap-2">
                      {selecionado.escalas.map(e => (
                        <span key={e} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exames */}
                {selecionado.exames_obrigatorios.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-2">🔬 Exames Obrigatórios</p>
                    <ul className="space-y-1">
                      {selecionado.exames_obrigatorios.map(e => (
                        <li key={e} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">→</span> {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Passos */}
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-3">🔄 Fluxo do Protocolo (5 passos)</p>
                  <div className="space-y-2">
                    {selecionado.passos_fluxo.map(passo => (
                      <div key={passo.numero} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: selecionado.cor }}
                        >
                          {passo.numero}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{passo.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{passo.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500 mb-3">📈 Indicadores — Empresa Demo</p>
                  <ProgressoProtocolo
                    label={selecionado.nome}
                    codigo={selecionado.codigo}
                    pct={calcProtocoloStats(selecionado.codigo).pct}
                    total={calcProtocoloStats(selecionado.codigo).total}
                    icone={selecionado.icone}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
