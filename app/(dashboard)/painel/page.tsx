import Link from 'next/link'
import { MetricCard } from '@/components/shared/MetricCard'
import { ProgressoProtocolo } from '@/components/shared/ProgressoProtocolo'
import { AlertaItem } from '@/components/shared/AlertaItem'
import {
  demoAlertas,
  demoAgendamentos,
  demoLinhas,
  demoPacientes,
} from '@/lib/demo-data'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { Badge } from '@/components/ui/badge'

function calcProtocoloPct(codigo: string) {
  const linhas = demoLinhas.filter(l => l.protocolo_codigo === codigo && l.status === 'ativo')
  if (!linhas.length) return { pct: 0, total: 0 }
  const ctrl = linhas.filter(l => l.nivel_gravidade === 'controlado').length
  return { pct: Math.round((ctrl / linhas.length) * 100), total: linhas.length }
}

const STATUS_AGENDA: Record<string, { label: string; className: string }> = {
  confirmado: { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-700' },
  agendado: { label: 'Agendado', className: 'bg-blue-100 text-blue-700' },
  realizado: { label: 'Realizado', className: 'bg-slate-100 text-slate-600' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
  faltou: { label: 'Faltou', className: 'bg-amber-100 text-amber-700' },
}

export default function DashboardPage() {
  const alertasAtivos = demoAlertas.filter(a => !a.resolvido)
  const alertasUrgentes = alertasAtivos.filter(a => a.prioridade === 'critica' || a.prioridade === 'alta')
  const alertasPrioritarios = [...alertasUrgentes, ...alertasAtivos.filter(a => a.prioridade === 'media' || a.prioridade === 'baixa')]
    .slice(0, 5)

  const linhasAtivas = demoLinhas.filter(l => l.status === 'ativo')
  const controladas = linhasAtivas.filter(l => l.nivel_gravidade === 'controlado').length
  const controladosPct = linhasAtivas.length ? Math.round((controladas / linhasAtivas.length) * 100) : 0

  const protocolosDisplay = [
    { codigo: 'HAS', icone: '❤️' },
    { codigo: 'DM', icone: '🩸' },
    { codigo: 'TAB', icone: '🚭' },
    { codigo: 'OBE', icone: '⚖️' },
    { codigo: 'DPC', icone: '🫁' },
    { codigo: 'SM', icone: '🧠' },
    { codigo: 'CHK', icone: '🔍' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total de Pacientes"
          value={demoPacientes.length}
          subtexto="em linha de cuidado ativa"
          cor="blue"
          icone={<span>👥</span>}
        />
        <MetricCard
          label="Consultas Hoje"
          value={demoAgendamentos.length}
          subtexto="agendadas para hoje"
          cor="default"
          icone={<span>📋</span>}
        />
        <MetricCard
          label="Em Atraso"
          value={alertasUrgentes.length}
          subtexto="alertas urgentes/críticos"
          cor="amber"
          tendencia="down"
          icone={<span>⚠️</span>}
        />
        <MetricCard
          label="Controlados"
          value={`${controladosPct}%`}
          subtexto={`${controladas} de ${linhasAtivas.length} linhas`}
          cor="green"
          tendencia="up"
          icone={<span>✅</span>}
        />
      </div>

      {/* Grid: Alertas + Controle */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alertas prioritários */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">🔔 Alertas Prioritários</h2>
            <Link href="/alertas" className="text-xs text-blue-600 hover:underline">
              Ver todos ({alertasAtivos.length})
            </Link>
          </div>
          <div className="space-y-2">
            {alertasPrioritarios.map(alerta => (
              <AlertaItem key={alerta.id} alerta={alerta} compact />
            ))}
          </div>
        </div>

        {/* Controle por protocolo */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">📊 Controle por Protocolo</h2>
          <div className="space-y-3">
            {protocolosDisplay.map(({ codigo, icone }) => {
              const protocolo = PROTOCOLO_MAP.get(codigo)
              if (!protocolo) return null
              const { pct, total } = calcProtocoloPct(codigo)
              return (
                <ProgressoProtocolo
                  key={codigo}
                  label={protocolo.nome}
                  codigo={codigo}
                  pct={pct}
                  total={total}
                  icone={icone}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Agenda do dia */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">
            📅 Agenda do Dia — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3 text-left">Horário</th>
                <th className="px-4 py-3 text-left">Paciente</th>
                <th className="px-4 py-3 text-left">Setor</th>
                <th className="px-4 py-3 text-left">Protocolos</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demoAgendamentos.map(ag => {
                const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const st = STATUS_AGENDA[ag.status]
                return (
                  <tr key={ag.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-slate-600">{hora}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{ag.paciente?.nome}</div>
                      <div className="text-xs text-slate-400">{ag.paciente?.matricula}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ag.paciente?.setor}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ag.protocolos_previstos.map(cod => {
                          const p = PROTOCOLO_MAP.get(cod)
                          return (
                            <span
                              key={cod}
                              className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: p?.cor ?? '#6b7280' }}
                            >
                              {cod}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/pacientes/${ag.paciente_id}/consulta`}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                      >
                        Atender
                      </Link>
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
