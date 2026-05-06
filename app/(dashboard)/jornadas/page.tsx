import Link from 'next/link'
import {
  IS_DEMO_MODE,
  demoPacientes, demoLinhas, demoEvolucoes, demoConsultas, demoExames,
} from '@/lib/demo-data'
import { createClient } from '@/lib/supabase/server'
import { calcularJornada, type StatusJornada } from '@/lib/jornada/motor'
import { gerarProximasAcoes, urgenciaBadge, prazoBadge, contatoIcon, type PacienteComJornadas } from '@/lib/jornada/proximas-acoes'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { cn } from '@/lib/utils'
import type {
  Paciente, LinhaCuidado, Consulta, EvolucaoClinica, ExameResultado,
} from '@/types'

// ─── Dados ───────────────────────────────────────────────────────────────────
//
// Em demo mode usa as fixtures locais; em modo real puxa do Supabase via RLS
// (já filtra por empresa_id). Esses arrays alimentam o motor de jornadas.

interface DadosJornada {
  pacientes: Paciente[]
  linhas: LinhaCuidado[]
  consultas: Consulta[]
  evolucoes: EvolucaoClinica[]
  exames: ExameResultado[]
}

async function carregarDados(): Promise<DadosJornada> {
  if (IS_DEMO_MODE) {
    return {
      pacientes: demoPacientes,
      linhas: demoLinhas,
      consultas: demoConsultas,
      evolucoes: demoEvolucoes,
      exames: demoExames,
    }
  }

  try {
    const supabase = await createClient()
    const [pacRes, linhasRes, consRes, evolRes, examesRes] = await Promise.all([
      supabase.from('pacientes').select('*').eq('ativo', true),
      supabase.from('linhas_cuidado').select('*').eq('status', 'ativo'),
      supabase.from('consultas').select('*').order('data_consulta', { ascending: false }).limit(2000),
      supabase.from('evolucoes_clinicas').select('*').order('created_at', { ascending: false }).limit(2000),
      supabase.from('exames_resultados').select('*').order('data_coleta', { ascending: false }).limit(2000),
    ])

    return {
      pacientes: (pacRes.data ?? []) as Paciente[],
      linhas: (linhasRes.data ?? []) as LinhaCuidado[],
      consultas: (consRes.data ?? []) as Consulta[],
      evolucoes: (evolRes.data ?? []) as EvolucaoClinica[],
      exames: (examesRes.data ?? []) as ExameResultado[],
    }
  } catch (err) {
    console.error('[Jornadas] carregarDados Supabase falhou', err)
    return { pacientes: [], linhas: [], consultas: [], evolucoes: [], exames: [] }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimarPasso(nivel?: string): number {
  if (nivel === 'controlado') return 5
  if (nivel === 'parcial') return 3
  return 2
}

async function buildJornadas(
  dados: DadosJornada,
): Promise<{ paciente_id: string; protocolo: string; jornada: StatusJornada }[]> {
  try {
    const ativas = (dados.linhas ?? []).filter(l => l?.status === 'ativo')
    if (ativas.length === 0) return []

    const resultados = await Promise.all(
      ativas.map(async (linha) => {
        try {
          const evolucoes = (dados.evolucoes ?? [])
            .filter(e => e.paciente_id === linha.paciente_id && e.protocolo_codigo === linha.protocolo_codigo)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

          const ultimaEvolucao = evolucoes[0]

          const historico = (dados.consultas ?? [])
            .filter(c => c.paciente_id === linha.paciente_id)
            .map(c => {
              const ev = (dados.evolucoes ?? []).find(e => e.consulta_id === c.id && e.protocolo_codigo === linha.protocolo_codigo)
              return { ...c, passo_protocolo: ev?.passo_protocolo, metricas: ev?.metricas ?? {} }
            })

          const exames = (dados.exames ?? []).filter(e => e.paciente_id === linha.paciente_id)

          const metricas = {
            ...((ultimaEvolucao?.metricas ?? {}) as Record<string, any>),
            passo_protocolo: ultimaEvolucao?.passo_protocolo ?? estimarPasso(linha.nivel_gravidade),
          }

          const jornada = await calcularJornada(linha.paciente_id, linha.protocolo_codigo, metricas, historico, exames)
          return { paciente_id: linha.paciente_id, protocolo: linha.protocolo_codigo, jornada }
        } catch (err) {
          console.error('[Jornadas] Falha ao calcular linha', linha.paciente_id, linha.protocolo_codigo, err)
          return null
        }
      })
    )

    return resultados.filter((r): r is { paciente_id: string; protocolo: string; jornada: StatusJornada } => r !== null)
  } catch (err) {
    console.error('[Jornadas] buildJornadas falhou', err)
    return []
  }
}

// ─── Funil por protocolo ──────────────────────────────────────────────────────

function buildFunil(todas: { paciente_id: string; protocolo: string; jornada: StatusJornada }[]) {
  const map = new Map<string, number[]>()

  for (const { protocolo, jornada } of todas) {
    if (!map.has(protocolo)) map.set(protocolo, [0, 0, 0, 0, 0])
    const steps = map.get(protocolo)!
    const idx = Math.min(4, Math.max(0, jornada.passo_atual - 1))
    steps[idx]++
  }

  return map
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JornadasPage() {
  const dados = await carregarDados()
  const todas = await buildJornadas(dados)

  // Build pacientes data for gerarProximasAcoes
  const pacientesMap = new Map(dados.pacientes.map(p => [p.id, p]))
  const linhaByPacProto = new Map<string, LinhaCuidado>()
  for (const l of dados.linhas) {
    linhaByPacProto.set(`${l.paciente_id}::${l.protocolo_codigo}`, l)
  }

  const porPaciente = new Map<string, StatusJornada[]>()
  for (const { paciente_id, jornada } of todas) {
    if (!porPaciente.has(paciente_id)) porPaciente.set(paciente_id, [])
    porPaciente.get(paciente_id)!.push(jornada)
  }

  const agora = Date.now()
  const pacientesComJornadas: PacienteComJornadas[] = []
  for (const [pac_id, jornadas] of porPaciente) {
    const pac = pacientesMap.get(pac_id)
    if (!pac) continue
    const ultimaConsulta = dados.consultas
      .filter(c => c.paciente_id === pac_id)
      .sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime())[0]

    // Quando o paciente nunca consultou, usamos a data de inscrição da linha
    // mais antiga como referência — assim o número reflete "dias na linha
    // sem consulta", em vez do antigo placeholder mágico de 999.
    let dias_sem_retorno: number
    if (ultimaConsulta) {
      dias_sem_retorno = Math.floor(
        (agora - new Date(ultimaConsulta.data_consulta).getTime()) / 86400000,
      )
    } else {
      const linhasDoPac = jornadas
        .map(j => linhaByPacProto.get(`${pac_id}::${j.protocolo}`))
        .filter((l): l is LinhaCuidado => Boolean(l))
      const maisAntiga = linhasDoPac
        .map(l => new Date(l.created_at).getTime())
        .filter(t => Number.isFinite(t))
        .sort((a, b) => a - b)[0]
      dias_sem_retorno = maisAntiga
        ? Math.floor((agora - maisAntiga) / 86400000)
        : 0
    }
    const metricasFlat = dados.evolucoes
      .filter(e => e.paciente_id === pac_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .reduce((acc, e) => ({ ...acc, ...(e.metricas as Record<string, any>) }), {} as Record<string, any>)

    pacientesComJornadas.push({
      paciente: { id: pac_id, nome: pac.nome },
      jornadas,
      metricas: metricasFlat,
      ultima_consulta: ultimaConsulta ?? null,
      dias_sem_retorno,
    })
  }

  const acoes = gerarProximasAcoes(pacientesComJornadas)
  const acaoImediata = acoes.filter(a => a.urgencia >= 4)
  const estaSemana = acoes.filter(a => a.urgencia === 2 || a.urgencia === 3)
  const funil = buildFunil(todas)

  const protocolosComFunil = [...funil.entries()]
    .map(([codigo, steps]) => ({ codigo, steps, protocolo: PROTOCOLO_MAP.get(codigo) }))
    .filter((x): x is { codigo: string; steps: number[]; protocolo: NonNullable<typeof x.protocolo> } =>
      Boolean(x.protocolo) && Array.isArray(x.protocolo!.passos_fluxo) && x.protocolo!.passos_fluxo.length > 0)
    .sort((a, b) => {
      const totalA = a.steps.reduce((s, n) => s + n, 0)
      const totalB = b.steps.reduce((s, n) => s + n, 0)
      return totalB - totalA
    })

  if (todas.length === 0) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Automação de Jornadas</h1>
          <p className="text-sm text-[#6B7280] mt-1">Visão consolidada das próximas ações por paciente.</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-2xl">
            🗺️
          </div>
          <p className="text-sm font-semibold text-[#111827]">Nenhuma jornada ativa</p>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
            Cadastre pacientes em linhas de cuidado para começar a acompanhar jornadas automatizadas.
          </p>
          <Link
            href="/pacientes/novo"
            className="mt-4 inline-flex rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors"
          >
            ＋ Novo Paciente
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#111827]">Automação de Jornadas</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {todas.length} linhas de cuidado ativas · {acaoImediata.length} ações imediatas · {estaSemana.length} para esta semana
        </p>
      </div>

      {/* ── SEÇÃO 1: Ação Imediata ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-3 rounded-full bg-[#DC2626] animate-pulse" />
          <h2 className="text-base font-bold text-[#111827]">Ação Imediata</h2>
          <span className="rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-xs font-bold text-[#991B1B] num-tabular">
            {acaoImediata.length}
          </span>
        </div>

        {acaoImediata.length === 0 ? (
          <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-5 py-4 text-sm font-medium text-[#065F46]">
            ✅ Nenhuma ação crítica ou urgente no momento.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {acaoImediata.map((acao, i) => {
              const badge = urgenciaBadge(acao.urgencia)
              const prazo = prazoBadge(acao.prazo)
              const isCritical = acao.urgencia >= 5
              const borderCor = isCritical ? '#DC2626' : '#D97706'
              const btnClass = isCritical
                ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                : 'bg-[#1E40AF] hover:bg-[#1E3A8A]'
              const protocolo = PROTOCOLO_MAP.get(acao.protocolo)
              return (
                <div
                  key={i}
                  className="group rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_2px_4px_-1px_rgba(0,0,0,0.05)]"
                  style={{ borderLeft: `4px solid ${borderCor}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#111827] truncate">{acao.paciente_nome ?? '—'}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: protocolo?.cor ?? '#6B7280' }}
                        >
                          {acao.protocolo}
                        </span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', badge.className)}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-lg shrink-0 leading-none">{contatoIcon(acao.tipo_contato)}</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#111827] leading-snug">{acao.acao}</p>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{acao.motivo}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span className={cn('text-xs font-semibold', prazo.className)}>{prazo.label}</span>
                    <Link
                      href={`/pacientes/${acao.paciente_id}/consulta`}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors',
                        btnClass,
                      )}
                    >
                      Atender Agora →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SEÇÃO 2: Esta Semana ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-3 rounded-full bg-[#D97706]" />
          <h2 className="text-base font-bold text-[#111827]">Esta Semana</h2>
          <span className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-xs font-bold text-[#92400E] num-tabular">
            {estaSemana.length}
          </span>
        </div>

        {estaSemana.length === 0 ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4 text-sm text-[#6B7280]">
            Nenhuma ação pendente para esta semana.
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7280]">
                  <th className="px-4 py-3 text-left">Paciente</th>
                  <th className="px-4 py-3 text-left">Protocolo</th>
                  <th className="px-4 py-3 text-left">Próxima Ação</th>
                  <th className="px-4 py-3 text-left">Prazo</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {estaSemana.slice(0, 20).map((acao, i) => {
                  const prazo = prazoBadge(acao.prazo)
                  const p = PROTOCOLO_MAP.get(acao.protocolo)
                  return (
                    <tr key={i} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/pacientes/${acao.paciente_id}`}
                          className="font-medium text-[#111827] hover:text-[#1E40AF] transition-colors"
                        >
                          {acao.paciente_nome}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: p?.cor ?? '#6B7280' }}
                        >
                          {acao.protocolo}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-[#111827] truncate">{acao.acao}</p>
                        <p className="text-xs text-[#9CA3AF] truncate">{acao.motivo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold', prazo.className)}>{prazo.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                          {contatoIcon(acao.tipo_contato)}
                          <span className="hidden sm:inline">
                            {{ consulta_presencial: 'Presencial', telefonema: 'Ligar', whatsapp: 'WhatsApp', email: 'E-mail' }[acao.tipo_contato]}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/pacientes/${acao.paciente_id}`}
                          className="rounded px-2 py-1 text-xs font-semibold text-[#1E40AF] hover:bg-[#EFF6FF] transition-colors"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── SEÇÃO 3: Visão Geral por Protocolo ────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <h2 className="text-base font-bold text-[#111827]">Visão Geral por Protocolo</h2>
          <span className="text-xs text-[#9CA3AF]">— distribuição por passo</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {protocolosComFunil.map(({ codigo, steps, protocolo: proto }) => {
            const total = steps.reduce((s, n) => s + n, 0)
            const meta = steps[4]
            const metaPct = total ? Math.round((meta / total) * 100) : 0
            const maxStep = Math.max(...steps, 1)

            return (
              <div key={codigo} className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07),0_2px_4px_-1px_rgba(0,0,0,0.05)]">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{proto.icone ?? '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#111827] truncate">{proto.nome}</p>
                    <p className="text-xs text-[#9CA3AF]">{total} paciente{total !== 1 ? 's' : ''} ativos</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold num-tabular" style={{ color: proto.cor }}>{metaPct}%</p>
                    <p className="text-[10px] text-[#9CA3AF]">na meta</p>
                  </div>
                </div>

                {/* Funnel bars */}
                <div className="space-y-2">
                  {proto.passos_fluxo.map((passo, idx) => {
                    const count = steps[idx] ?? 0
                    const barPct = maxStep > 0 ? Math.round((count / maxStep) * 100) : 0
                    const isLast = idx === proto.passos_fluxo.length - 1
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 text-[10px] font-bold text-[#9CA3AF] text-right shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 relative h-5 rounded bg-[#F1F5F9] overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: isLast ? proto.cor : `${proto.cor}60`,
                            }}
                          />
                          <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-[#111827]">
                            {passo?.titulo ?? `Passo ${idx + 1}`}
                          </span>
                        </div>
                        <span className={cn(
                          'w-7 text-right text-xs font-bold num-tabular shrink-0',
                          count > 0 ? 'text-[#111827]' : 'text-[#D1D5DB]'
                        )}>
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">
                    {meta} paciente{meta !== 1 ? 's' : ''} na meta
                  </span>
                  <Link
                    href={`/pacientes?protocolo=${codigo}`}
                    className="text-xs font-semibold text-[#1E40AF] hover:text-[#1E3A8A] transition-colors"
                  >
                    Ver pacientes →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
