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
  demoEmpresa,
  demoIndicadores,
} from '@/lib/demo-data'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { createClient } from '@/lib/supabase/client'
import { subscribeTables } from '@/lib/supabase/realtime'
import type { Alerta, Agendamento, LinhaCuidado, IndicadoresEmpresa, Empresa } from '@/types'
import { useContadores } from '../_components/use-contadores'
import { calcularNpsAgregado, type RegistroPREM } from '@/lib/escalas/prems'
import { IAPopulacionalPanel, type PromptIAPopulacional } from '@/components/ia/IAPopulacionalPanel'

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

// Protocolos referenciados pelo painel de IA populacional
const PROTOCOLOS_IA = ['HAS', 'DM', 'OBE', 'DIS', 'TAB', 'DPC', 'TAG', 'CHK', 'SM']

function calcDelta(serie: Array<number | undefined>): number | undefined {
  const validos = serie.filter((v): v is number => typeof v === 'number')
  if (validos.length < 2) return undefined
  const ultimo = validos[validos.length - 1]
  const anterior = validos[validos.length - 2]
  return Math.round((ultimo - anterior) * 10) / 10
}

export default function DashboardPage() {
  const contadores = useContadores()
  const [alertas, setAlertas] = useState<Alerta[]>(IS_DEMO_MODE ? demoAlertas : [])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(IS_DEMO_MODE ? demoAgendamentos : [])
  const [linhas, setLinhas] = useState<LinhaCuidado[]>(IS_DEMO_MODE ? demoLinhas : [])
  const [prems, setPrems] = useState<RegistroPREM[]>([])
  const [indicadores, setIndicadores] = useState<IndicadoresEmpresa[]>(IS_DEMO_MODE ? demoIndicadores : [])
  const [empresa, setEmpresa] = useState<Empresa>(demoEmpresa)
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
        const [alertasRes, agendaRes, linhasRes, premsRes, indRes, empRes] = await Promise.allSettled([
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
          supabase.from('indicadores_empresa').select('*').order('competencia', { ascending: true }).limit(12),
          supabase.from('empresas').select('*').limit(1).single(),
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

        if (premsRes.status === 'fulfilled' && Array.isArray(premsRes.value?.data)) {
          setPrems(premsRes.value.data as RegistroPREM[])
        } else if (premsRes.status === 'rejected') {
          console.warn('[painel] prems_aplicados (opcional):', premsRes.reason)
        }

        if (indRes.status === 'fulfilled' && Array.isArray(indRes.value?.data) && indRes.value.data.length > 0) {
          setIndicadores(indRes.value.data as IndicadoresEmpresa[])
        }

        if (empRes.status === 'fulfilled' && empRes.value?.data) {
          setEmpresa(empRes.value.data as Empresa)
        }
      } catch (e) {
        console.error('[painel] fetchTudo:', e)
        if (!cancelado) setErroFetch(e instanceof Error ? e.message : 'Erro ao carregar dados')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    fetchTudo()

    const unsubscribe = subscribeTables(
      ['alertas', 'agendamentos', 'linhas_cuidado', 'prems_aplicados'],
      fetchTudo,
    )

    return () => {
      cancelado = true
      unsubscribe()
    }
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

  // Sparklines + deltas a partir da série de indicadores
  const sparkPacientes = useMemo(
    () => indicadores.map(i => i.total_pacientes).filter((v): v is number => typeof v === 'number'),
    [indicadores],
  )
  const sparkControle = useMemo(
    () => indicadores.map(i => i.taxa_controle_geral).filter((v): v is number => typeof v === 'number'),
    [indicadores],
  )
  const deltaControle = useMemo(
    () => calcDelta(indicadores.map(i => i.taxa_controle_geral)),
    [indicadores],
  )
  const deltaPacientes = useMemo(
    () => calcDelta(indicadores.map(i => i.total_pacientes)),
    [indicadores],
  )

  // Hero "Foco do dia"
  const agora = useMemo(() => new Date(), [])
  const proximoAtendimento = useMemo(() => {
    const upcoming = (agendamentos ?? [])
      .filter(a => a?.data_hora && (a.status === 'agendado' || a.status === 'confirmado'))
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    return upcoming[0] ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamentos])
  const realizadosHoje = useMemo(
    () => (agendamentos ?? []).filter(a => a?.status === 'realizado').length,
    [agendamentos],
  )
  const totalAgenda = (agendamentos ?? []).length
  const proximaHora = (() => {
    if (!proximoAtendimento?.data_hora) return null
    try {
      return new Date(proximoAtendimento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return null
    }
  })()
  const minutosAtePrx = (() => {
    if (!proximoAtendimento?.data_hora) return null
    try {
      const diff = (new Date(proximoAtendimento.data_hora).getTime() - agora.getTime()) / 60000
      if (diff < 0) return null
      return Math.round(diff)
    } catch {
      return null
    }
  })()

  // Entrada da IA populacional (modo sumário)
  const entradaIA = useMemo<PromptIAPopulacional>(() => {
    const protocolos = PROTOCOLOS_IA.map(codigo => {
      const ativos = (linhas ?? []).filter(l => l?.protocolo_codigo === codigo && l?.status === 'ativo')
      return {
        codigo,
        nome: PROTOCOLO_MAP.get(codigo)?.nome,
        total_ativos: ativos.length,
        controlados_pct: protocoloPct(codigo).pct,
      }
    }).filter(p => p.total_ativos > 0)
    return {
      empresa: { nome: empresa.nome, total_colaboradores: empresa.total_colaboradores },
      indicadores: indicadores.map(i => ({
        competencia: i.competencia,
        total_pacientes: i.total_pacientes,
        taxa_controle_geral: i.taxa_controle_geral,
        has_controlados_pct: i.has_controlados_pct,
        dm_controlados_pct: i.dm_controlados_pct,
        tab_cessacao_pct: i.tab_cessacao_pct,
      })),
      protocolos,
    }
  }, [empresa, indicadores, linhas, protocoloPct])

  const cacheKeyIA = `${empresa.id ?? 'demo'}:dashboard:${indicadores.length}:${linhas.length}`

  return (
    <div className="space-y-6">
      {/* Hero "Foco do dia" */}
      <div className="rounded-2xl border border-[#1E3A8A]/20 bg-gradient-to-br from-[#1E40AF] via-[#1E3A8A] to-[#0F172A] p-5 text-white shadow-[0_4px_12px_-2px_rgba(30,64,175,0.25)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Foco do dia</p>
            {proximoAtendimento ? (
              <>
                <h2 className="mt-1 text-xl font-bold leading-tight">
                  {minutosAtePrx !== null && minutosAtePrx <= 30
                    ? `Próxima consulta em ${minutosAtePrx} min`
                    : `Próximo: ${proximoAtendimento.paciente?.nome ?? '—'}`}
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  {proximaHora && <span className="font-mono">{proximaHora}</span>}
                  {proximoAtendimento.paciente?.nome && minutosAtePrx !== null && minutosAtePrx <= 30 && (
                    <> · {proximoAtendimento.paciente.nome}</>
                  )}
                  {proximoAtendimento.paciente?.setor && <> · {proximoAtendimento.paciente.setor}</>}
                </p>
              </>
            ) : totalAgenda > 0 ? (
              <>
                <h2 className="mt-1 text-xl font-bold leading-tight">Agenda do dia concluída</h2>
                <p className="mt-1 text-sm text-white/80">
                  {realizadosHoje} de {totalAgenda} atendimentos realizados.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-1 text-xl font-bold leading-tight">Sem agendamentos para hoje</h2>
                <p className="mt-1 text-sm text-white/80">
                  Bom momento para revisar alertas pendentes ou solicitar exames atrasados.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Hoje</p>
              <p className="text-lg font-bold num-tabular">
                {realizadosHoje}<span className="text-white/50 text-sm font-normal"> / {totalAgenda}</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Críticos</p>
              <p className="text-lg font-bold num-tabular text-amber-200">
                {contadores?.alertasUrgentes ?? 0}
              </p>
            </div>
            {proximoAtendimento?.paciente_id && (
              <Link
                href={`/pacientes/${proximoAtendimento.paciente_id}/consulta`}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1E40AF] hover:bg-white/90 transition-colors shadow-sm"
              >
                Iniciar atendimento →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pacientes Ativos"
          value={contadores?.pacientes ?? 0}
          subtexto="cadastrados na empresa"
          cor="blue"
          icone={<span>👥</span>}
          carregando={contadores?.carregando}
          delta={deltaPacientes}
          sparkline={sparkPacientes}
        />
        <MetricCard
          label="Jornadas em Andamento"
          value={contadores?.linhasAtivas ?? 0}
          subtexto="linhas de cuidado ativas"
          cor="default"
          icone={<span>🗺️</span>}
          carregando={contadores?.carregando}
        />
        <MetricCard
          label="Alertas Ativos"
          value={contadores?.alertas ?? 0}
          subtexto={
            (contadores?.alertasUrgentes ?? 0) > 0
              ? `${contadores.alertasUrgentes} urgente${contadores.alertasUrgentes > 1 ? 's' : ''}`
              : 'sem urgências'
          }
          cor="amber"
          icone={<span>🔔</span>}
          carregando={contadores?.carregando}
        />
        <MetricCard
          label="Taxa de Controle"
          value={`${contadores?.controladosPct ?? 0}%`}
          subtexto={`${contadores?.linhasControladas ?? 0} de ${contadores?.linhasAtivas ?? 0} controladas`}
          cor="green"
          icone={<span>✅</span>}
          carregando={contadores?.carregando}
          delta={deltaControle}
          deltaSufixo="pp"
          sparkline={sparkControle}
        />
      </div>

      {/* Insights IA + NPS lado a lado quando ambos disponíveis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IAPopulacionalPanel
          cacheKey={cacheKeyIA}
          entrada={entradaIA}
          modo="sumario"
          autoCarregar
          titulo="Insights da empresa"
        />

        {npsAgregado && npsAgregado.total > 0 ? (
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
        ) : (
          // placeholder — ocupa o slot quando não há NPS, evitando que IA fique sozinha
          <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-5 flex flex-col items-start justify-center text-sm text-[#6B7280]">
            <h3 className="text-sm font-semibold text-[#374151]">📣 NPS</h3>
            <p className="mt-1 text-xs">
              Aguardando primeiras respostas de PREM. O NPS aparece aqui após a primeira aplicação.
            </p>
            <Link href="/escalas" className="mt-3 text-xs font-semibold text-[#1E40AF] hover:text-[#1E3A8A]">
              Aplicar PREM →
            </Link>
          </div>
        )}
      </div>

      {erroFetch && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Não foi possível carregar todos os dados em tempo real: {erroFetch}. Reconectando…
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
