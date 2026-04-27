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
  confirmado: { label: 'Confirmado', className: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' },
  agendado:   { label: 'Agendado',   className: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]' },
  realizado:  { label: 'Realizado',  className: 'bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]' },
  cancelado:  { label: 'Cancelado',  className: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' },
  faltou:     { label: 'Faltou',     className: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]' },
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
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#111827]">🔔 Alertas Prioritários</h2>
            <Link href="/alertas" className="text-xs font-semibold text-[#1E40AF] hover:text-[#1E3A8A] transition-colors">
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
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 font-semibold text-[#111827]">📊 Controle por Protocolo</h2>
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
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <h2 className="font-semibold text-[#111827]">
            📅 Agenda do Dia — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7280]">
                <th className="px-4 py-3 text-left">Horário</th>
                <th className="px-4 py-3 text-left">Paciente</th>
                <th className="px-4 py-3 text-left">Setor</th>
                <th className="px-4 py-3 text-left">Protocolos</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right pr-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {demoAgendamentos.map(ag => {
                const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const st = STATUS_AGENDA[ag.status]
                return (
                  <tr key={ag.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-[#6B7280] num-tabular">{hora}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#111827]">{ag.paciente?.nome}</div>
                      <div className="text-xs text-[#9CA3AF]">{ag.paciente?.matricula}</div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{ag.paciente?.setor}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ag.protocolos_previstos.map(cod => {
                          const p = PROTOCOLO_MAP.get(cod)
                          return (
                            <span
                              key={cod}
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: p?.cor ?? '#6B7280' }}
                            >
                              {cod}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 pr-5 text-right">
                      <Link
                        href={`/pacientes/${ag.paciente_id}/consulta`}
                        className="inline-flex rounded-lg bg-[#1E40AF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors"
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
