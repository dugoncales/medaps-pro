import Link from 'next/link'
import {
  demoPacientes, demoLinhas, demoEvolucoes, demoConsultas, demoExames,
} from '@/lib/demo-data'
import { calcularJornada, type StatusJornada } from '@/lib/jornada/motor'
import { gerarProximasAcoes, urgenciaBadge, prazoBadge, contatoIcon, type PacienteComJornadas } from '@/lib/jornada/proximas-acoes'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimarPasso(nivel?: string): number {
  if (nivel === 'controlado') return 5
  if (nivel === 'parcial') return 3
  return 2
}

async function buildJornadas(): Promise<{ paciente_id: string; protocolo: string; jornada: StatusJornada }[]> {
  const ativas = demoLinhas.filter(l => l.status === 'ativo')

  return Promise.all(
    ativas.map(async (linha) => {
      const evolucoes = demoEvolucoes
        .filter(e => e.paciente_id === linha.paciente_id && e.protocolo_codigo === linha.protocolo_codigo)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      const ultimaEvolucao = evolucoes[0]

      const historico = demoConsultas
        .filter(c => c.paciente_id === linha.paciente_id)
        .map(c => {
          const ev = demoEvolucoes.find(e => e.consulta_id === c.id && e.protocolo_codigo === linha.protocolo_codigo)
          return { ...c, passo_protocolo: ev?.passo_protocolo, metricas: ev?.metricas ?? {} }
        })

      const exames = demoExames.filter(e => e.paciente_id === linha.paciente_id)

      const metricas = {
        ...((ultimaEvolucao?.metricas ?? {}) as Record<string, any>),
        passo_protocolo: ultimaEvolucao?.passo_protocolo ?? estimarPasso(linha.nivel_gravidade),
      }

      const jornada = await calcularJornada(linha.paciente_id, linha.protocolo_codigo, metricas, historico, exames)
      return { paciente_id: linha.paciente_id, protocolo: linha.protocolo_codigo, jornada }
    })
  )
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
  const todas = await buildJornadas()

  // Build pacientes data for gerarProximasAcoes
  const pacientesMap = new Map(demoPacientes.map(p => [p.id, p]))

  const porPaciente = new Map<string, StatusJornada[]>()
  for (const { paciente_id, jornada } of todas) {
    if (!porPaciente.has(paciente_id)) porPaciente.set(paciente_id, [])
    porPaciente.get(paciente_id)!.push(jornada)
  }

  const pacientesComJornadas: PacienteComJornadas[] = []
  for (const [pac_id, jornadas] of porPaciente) {
    const pac = pacientesMap.get(pac_id)
    if (!pac) continue
    const ultimaConsulta = demoConsultas
      .filter(c => c.paciente_id === pac_id)
      .sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime())[0]
    const dias_sem_retorno = ultimaConsulta
      ? Math.floor((Date.now() - new Date(ultimaConsulta.data_consulta).getTime()) / 86400000)
      : 999
    const metricasFlat = demoEvolucoes
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
    .filter(x => x.protocolo)
    .sort((a, b) => {
      const totalA = a.steps.reduce((s, n) => s + n, 0)
      const totalB = b.steps.reduce((s, n) => s + n, 0)
      return totalB - totalA
    })

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Automação de Jornadas</h1>
        <p className="text-sm text-slate-500 mt-1">
          {todas.length} linhas de cuidado ativas · {acaoImediata.length} ações imediatas · {estaSemana.length} para esta semana
        </p>
      </div>

      {/* ── SEÇÃO 1: Ação Imediata ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-base font-bold text-slate-800">Ação Imediata</h2>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
            {acaoImediata.length}
          </span>
        </div>

        {acaoImediata.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            ✅ Nenhuma ação crítica ou urgente no momento.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {acaoImediata.map((acao, i) => {
              const badge = urgenciaBadge(acao.urgencia)
              const prazo = prazoBadge(acao.prazo)
              return (
                <div
                  key={i}
                  className="rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{acao.paciente_nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {(() => {
                          const p = PROTOCOLO_MAP.get(acao.protocolo)
                          return (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: p?.cor ?? '#6b7280' }}
                            >
                              {acao.protocolo}
                            </span>
                          )
                        })()}
                        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', badge.className)}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-lg shrink-0">{contatoIcon(acao.tipo_contato)}</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">{acao.acao}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{acao.motivo}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className={cn('text-xs font-semibold', prazo.className)}>{prazo.label}</span>
                    <Link
                      href={`/pacientes/${acao.paciente_id}/consulta`}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition-colors"
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
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <h2 className="text-base font-bold text-slate-800">Esta Semana</h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {estaSemana.length}
          </span>
        </div>

        {estaSemana.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
            Nenhuma ação pendente para esta semana.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                  <th className="px-4 py-3 text-left">Paciente</th>
                  <th className="px-4 py-3 text-left">Protocolo</th>
                  <th className="px-4 py-3 text-left">Próxima Ação</th>
                  <th className="px-4 py-3 text-left">Prazo</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {estaSemana.slice(0, 20).map((acao, i) => {
                  const badge = urgenciaBadge(acao.urgencia)
                  const prazo = prazoBadge(acao.prazo)
                  const p = PROTOCOLO_MAP.get(acao.protocolo)
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/pacientes/${acao.paciente_id}`}
                          className="font-medium text-slate-800 hover:text-blue-600 transition-colors"
                        >
                          {acao.paciente_nome}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: p?.cor ?? '#6b7280' }}
                        >
                          {acao.protocolo}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-slate-700 truncate">{acao.acao}</p>
                        <p className="text-xs text-slate-400 truncate">{acao.motivo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold', prazo.className)}>{prazo.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          {contatoIcon(acao.tipo_contato)}
                          <span className="hidden sm:inline">
                            {{ consulta_presencial: 'Presencial', telefonema: 'Ligar', whatsapp: 'WhatsApp', email: 'E-mail' }[acao.tipo_contato]}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/pacientes/${acao.paciente_id}`}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
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
          <h2 className="text-base font-bold text-slate-800">Visão Geral por Protocolo</h2>
          <span className="text-xs text-slate-400">— distribuição por passo</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {protocolosComFunil.map(({ codigo, steps, protocolo: proto }) => {
            const total = steps.reduce((s, n) => s + n, 0)
            const meta = steps[4]
            const metaPct = total ? Math.round((meta / total) * 100) : 0
            const maxStep = Math.max(...steps, 1)

            return (
              <div key={codigo} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{proto!.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{proto!.nome}</p>
                    <p className="text-xs text-slate-400">{total} paciente{total !== 1 ? 's' : ''} ativos</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold" style={{ color: proto!.cor }}>{metaPct}%</p>
                    <p className="text-[10px] text-slate-400">na meta</p>
                  </div>
                </div>

                {/* Funnel bars */}
                <div className="space-y-2">
                  {proto!.passos_fluxo.map((passo, idx) => {
                    const count = steps[idx]
                    const barPct = maxStep > 0 ? Math.round((count / maxStep) * 100) : 0
                    const isLast = idx === proto!.passos_fluxo.length - 1
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 text-[10px] font-bold text-slate-400 text-right shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 relative h-5 rounded bg-slate-100 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: isLast ? proto!.cor : `${proto!.cor}60`,
                            }}
                          />
                          <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-slate-700">
                            {passo.titulo}
                          </span>
                        </div>
                        <span className={cn(
                          'w-7 text-right text-xs font-bold shrink-0',
                          count > 0 ? 'text-slate-700' : 'text-slate-300'
                        )}>
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {meta} paciente{meta !== 1 ? 's' : ''} na meta
                  </span>
                  <Link
                    href={`/pacientes?protocolo=${codigo}`}
                    className="text-xs font-medium text-blue-600 hover:underline"
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
