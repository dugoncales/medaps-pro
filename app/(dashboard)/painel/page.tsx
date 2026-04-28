'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MetricCard } from '@/components/shared/MetricCard'
import { ProgressoProtocolo } from '@/components/shared/ProgressoProtocolo'
import { AlertaItem } from '@/components/shared/AlertaItem'
import {
  IS_DEMO_MODE,
  demoAlertas,
  demoAgendamentos,
  demoLinhas,
} from '@/lib/demo-data'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { createClient } from '@/lib/supabase/client'
import type { Alerta, Agendamento, LinhaCuidado } from '@/types'
import { useContadores } from '../_components/use-contadores'
import { calcularNpsAgregado, type RegistroPREM } from '@/lib/escalas/prems'

const STATUS_AGENDA: Record<string, { label: string; className: string }> = {
  confirmado: { label: 'Confirmado', className: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' },
  agendado:   { label: 'Agendado',   className: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]' },
  realizado:  { label: 'Realizado',  className: 'bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB]' },
  cancelado:  { label: 'Cancelado',  className: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' },
  faltou:     { label: 'Faltou',     className: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]' },
}

const PROTOCOLOS_DISPLAY = [
  { codigo: 'HAS', icone: '❤️' },
  { codigo: 'DM', icone: '🩸' },
  { codigo: 'TAB', icone: '🚭' },
  { codigo: 'OBE', icone: '⚖️' },
  { codigo: 'DPC', icone: '🫁' },
  { codigo: 'SM', icone: '🧠' },
  { codigo: 'CHK', icone: '🔍' },
]

export default function DashboardPage() {
  const contadores = useContadores()
  const [alertas, setAlertas] = useState<Alerta[]>(IS_DEMO_MODE ? demoAlertas : [])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(IS_DEMO_MODE ? demoAgendamentos : [])
  const [linhas, setLinhas] = useState<LinhaCuidado[]>(IS_DEMO_MODE ? demoLinhas : [])
  const [prems, setPrems] = useState<RegistroPREM[]>([])
  const [carregando, setCarregando] = useState<boolean>(() => !IS_DEMO_MODE)
  const [erroFetch, setErroFetch] = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEMO_MODE) return
    const supabase = createClient()
    let cancelado = false

    async function fetchTudo() {
      const hojeIni = new Date(); hojeIni.setHours(0, 0, 0, 0)
      const hojeFim = new Date(); hojeFim.setHours(23, 59, 59, 999)

      try {
        const [alertasRes, agendaRes, linhasRes, premsRes] = await Promise.allSettled([
          supabase.from('alertas')
            .select('*, paciente:pacientes(nome, matricula)')
            .eq('resolvido', false)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase.from('agendamentos')
            .select('*, paciente:pacientes(nome, matricula, setor)')
            .gte('data_hora', hojeIni.toISOString())
            .lte('data_hora', hojeFim.toISOString())
            .order('data_hora', { ascending: true }),
          supabase.from('linhas_cuidado').select('*').eq('status', 'ativo'),
          supabase.from('prems_aplicados').select('*').order('data_aplicacao', { ascending: false }).limit(200),
        ])

        if (cancelado) return

        if (alertasRes.status === 'fulfilled' && Array.isArray(alertasRes.value?.data)) {
          setAlertas(alertasRes.value.data as Alerta[])
        } else if (alertasRes.status === 'rejected') {
          console.error('[painel] alertas:', alertasRes.reason)
        }

        if (agendaRes.status === 'fulfilled' && Array.isArray(agendaRes.value?.data)) {
          setAgendamentos(agendaRes.value.data as Agendamento[])
        } else if (agendaRes.status === 'rejected') {
          console.error('[painel] agendamentos:', agendaRes.reason)
        }

        if (linhasRes.status === 'fulfilled' && Array.isArray(linhasRes.value?.data)) {
          setLinhas(linhasRes.value.data as LinhaCuidado[])
        } else if (linhasRes.status === 'rejected') {
          console.error('[painel] linhas_cuidado:', linhasRes.reason)
        }

        // prems_aplicados é opcional — depende da migration 002
        if (premsRes.status === 'fulfilled' && Array.isArray(premsRes.value?.data)) {
          setPrems(premsRes.value.data as RegistroPREM[])
        } else if (premsRes.status === 'rejected') {
          console.warn('[painel] prems_aplicados (opcional):', premsRes.reason)
        }
      } catch (e) {
        console.error('[painel] fetchTudo:', e)
        if (!cancelado) setErroFetch(e instanceof Error ? e.message : 'Erro ao carregar dados')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    fetchTudo()

    const ch = supabase.channel('painel-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linhas_cuidado' }, fetchTudo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prems_aplicados' }, fetchTudo)
      .subscribe()

    return () => { cancelado = true; supabase.removeChannel(ch) }
  }, [])

  const alertasUrgentes = useMemo(
    () => (alertas ?? []).filter(a => !a?.resolvido && (a?.prioridade === 'critica' || a?.prioridade === 'alta')),
    [alertas],
  )
  const alertasPrioritarios = useMemo(
    () => [
      ...alertasUrgentes,
      ...(alertas ?? []).filter(a => !a?.resolvido && (a?.prioridade === 'media' || a?.prioridade === 'baixa')),
    ].slice(0, 5),
    [alertas, alertasUrgentes],
  )

  const protocoloPct = useMemo(() => (codigo: string) => {
    const ls = (linhas ?? []).filter(l => l?.protocolo_codigo === codigo && l?.status === 'ativo')
    if (!ls.length) return { pct: 0, total: 0 }
    const ctrl = ls.filter(l => l?.nivel_gravidade === 'controlado').length
    return { pct: Math.round((ctrl / ls.length) * 100), total: ls.length }
  }, [linhas])

  const npsAgregado = useMemo(() => calcularNpsAgregado(prems ?? []), [prems])

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total de Pacientes"
          value={contadores?.pacientes ?? 0}
          subtexto="em linha de cuidado ativa"
          cor="blue"
          icone={<span>👥</span>}
        />
        <MetricCard
          label="Consultas Hoje"
          value={contadores?.consultasHoje || (agendamentos?.length ?? 0)}
          subtexto="agendadas para hoje"
          cor="default"
          icone={<span>📋</span>}
        />
        <MetricCard
          label="Em Atraso"
          value={contadores?.alertasUrgentes ?? 0}
          subtexto="alertas urgentes/críticos"
          cor="amber"
          tendencia="down"
          icone={<span>⚠️</span>}
        />
        <MetricCard
          label="Controlados"
          value={`${contadores?.controladosPct ?? 0}%`}
          subtexto={`${contadores?.linhasControladas ?? 0} de ${contadores?.linhasAtivas ?? 0} linhas`}
          cor="green"
          tendencia="up"
          icone={<span>✅</span>}
        />
      </div>

      {erroFetch && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Não foi possível carregar todos os dados em tempo real: {erroFetch}. Reconectando…
        </div>
      )}

      {/* Widget NPS — só aparece com pelo menos 1 resposta NPS */}
      {npsAgregado && npsAgregado.total > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">📣 NPS — Experiência do Paciente</h3>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                Baseado em {npsAgregado.total} resposta{npsAgregado.total > 1 ? 's' : ''} de PREM nos últimos 6 meses.
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${npsAgregado.atual >= 50 ? 'text-emerald-600' : npsAgregado.atual >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {npsAgregado.atual}
              </span>
              {npsAgregado.delta !== null && npsAgregado.delta !== undefined && (
                <span className={`text-xs font-semibold ${npsAgregado.delta > 0 ? 'text-emerald-600' : npsAgregado.delta < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                  {npsAgregado.delta > 0 ? '▲' : npsAgregado.delta < 0 ? '▼' : '='} {Math.abs(npsAgregado.delta)} vs. mês anterior
                </span>
              )}
            </div>
          </div>
          {Array.isArray(npsAgregado.sparkline) && npsAgregado.sparkline.length > 1 && (
            <div className="mt-3 flex h-10 items-end gap-1">
              {npsAgregado.sparkline.map((v, i) => {
                const valor = typeof v === 'number' && Number.isFinite(v) ? v : 0
                const altura = Math.max(8, ((valor + 100) / 200) * 100)
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-blue-500/70"
                    style={{ height: `${altura}%` }}
                    title={`NPS: ${valor}`}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Grid: Alertas + Controle */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alertas prioritários */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#111827]">🔔 Alertas Prioritários</h2>
            <Link href="/alertas" className="text-xs font-semibold text-[#1E40AF] hover:text-[#1E3A8A] transition-colors">
              Ver todos ({contadores?.alertas ?? 0})
            </Link>
          </div>
          <div className="space-y-2">
            {carregando ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 animate-pulse">
                Carregando alertas…
              </p>
            ) : alertasPrioritarios.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                Nenhum alerta prioritário no momento.
              </p>
            ) : (
              alertasPrioritarios.map(alerta => (
                <AlertaItem key={alerta.id} alerta={alerta} compact />
              ))
            )}
          </div>
        </div>

        {/* Controle por protocolo */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 font-semibold text-[#111827]">📊 Controle por Protocolo</h2>
          <div className="space-y-3">
            {PROTOCOLOS_DISPLAY.map(({ codigo, icone }) => {
              const protocolo = PROTOCOLO_MAP.get(codigo)
              if (!protocolo) return null
              const { pct, total } = protocoloPct(codigo)
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
            📅 Agenda do Dia
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
              {carregando ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400 animate-pulse">
                    Carregando agenda…
                  </td>
                </tr>
              ) : (agendamentos?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Sem agendamentos para hoje.
                  </td>
                </tr>
              ) : (
                (agendamentos ?? []).map(ag => {
                  if (!ag) return null
                  let hora = '—'
                  try {
                    if (ag.data_hora) {
                      hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    }
                  } catch { /* ignore date format errors */ }
                  const st = (ag.status && STATUS_AGENDA[ag.status]) ?? STATUS_AGENDA.agendado
                  const protocolos = Array.isArray(ag.protocolos_previstos) ? ag.protocolos_previstos : []
                  return (
                    <tr key={ag.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-[#6B7280] num-tabular">{hora}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#111827]">{ag.paciente?.nome ?? '—'}</div>
                        <div className="text-xs text-[#9CA3AF]">{ag.paciente?.matricula ?? ''}</div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{ag.paciente?.setor ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {protocolos.map(cod => {
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
                        {ag.paciente_id && (
                          <Link
                            href={`/pacientes/${ag.paciente_id}/consulta`}
                            className="inline-flex rounded-lg bg-[#1E40AF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors"
                          >
                            Atender
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
