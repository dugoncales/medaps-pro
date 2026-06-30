'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { demoPacientes, demoLinhas, demoEvolucoes, demoConsultas, demoProfissional, getConsultasByPaciente, getExamesByPaciente, getAlertasByPaciente, calcularIdade, IS_DEMO_MODE } from '@/lib/demo-data'
import { useRuntimeStore } from '@/lib/store/runtime-store'
import { createClient } from '@/lib/supabase/client'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import type { Paciente, LinhaCuidado } from '@/types'
import { calcularJornada, type StatusJornada } from '@/lib/jornada/motor'
import { JornadaTimeline } from '@/components/jornada/JornadaTimeline'
import { EvolucaoPROMs } from '@/components/consulta/EvolucaoPROMs'
import { HistoricoEscalas } from '@/components/consulta/HistoricoEscalas'
import { EditarPacienteModal } from '@/components/paciente/EditarPacienteModal'
import { AdicionarLinhaModal } from '@/components/paciente/AdicionarLinhaModal'
import { AgendarConsultaModal } from '@/components/paciente/AgendarConsultaModal'
import { IAClinicalPanel } from '@/components/ia/IAClinicalPanel'
import { formatMatricula } from '@/lib/format'
import { StatusPill } from '@/components/shared/StatusPill'
import { AlertaItem } from '@/components/shared/AlertaItem'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

// ─── Jornada Tab ─────────────────────────────────────────────────────────────

const DURACAO_STEP = 30 // dias médios por passo (estimativa conservadora)

function JornadaTab({
  jornadas, carregando, pacienteId, linhas, onAdicionarLinha, onAgendarConsulta,
}: {
  jornadas: StatusJornada[]
  carregando: boolean
  pacienteId: string
  linhas: import('@/types').LinhaCuidado[]
  onAdicionarLinha: () => void
  onAgendarConsulta: (protocoloCodigo?: string) => void
}) {
  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-400">
        <span className="animate-spin mr-2">⏳</span> Calculando jornadas…
      </div>
    )
  }

  if (jornadas.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-400">Nenhuma linha de cuidado ativa.</p>
        <Button
          onClick={onAdicionarLinha}
          className="mt-4 bg-blue-600 hover:bg-blue-500 gap-1.5"
        >
          + Adicionar linha de cuidado
        </Button>
      </div>
    )
  }

  // Overall progress: average of all protocols
  const progresso = Math.round(jornadas.reduce((s, j) => s + j.percentual_conclusao, 0) / jornadas.length)

  // History from evolucoes sorted by date
  const historicoPassos = demoEvolucoes
    .filter(e => e.paciente_id === pacienteId && e.passo_protocolo !== undefined)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(e => ({
      protocolo: e.protocolo_codigo,
      passo: e.passo_protocolo!,
      data: new Date(e.created_at),
      proto: PROTOCOLO_MAP.get(e.protocolo_codigo),
    }))

  // Estimated goal for each jornada
  function estimarMeta(j: StatusJornada): Date | null {
    const totalPassos = PROTOCOLO_MAP.get(j.protocolo)?.passos_fluxo.length ?? 5
    const passosRestantes = totalPassos - j.passo_atual
    if (passosRestantes <= 0) return null
    const hoje = new Date()
    hoje.setDate(hoje.getDate() + passosRestantes * DURACAO_STEP)
    return hoje
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={onAdicionarLinha}
          variant="outline"
          className="gap-1.5"
        >
          + Adicionar linha de cuidado
        </Button>
      </div>

      {/* Overall progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700">Progresso Geral da Linha de Cuidado</h3>
          <span className="text-2xl font-bold text-blue-600">{progresso}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-700"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {jornadas.map(j => {
            const proto = PROTOCOLO_MAP.get(j.protocolo)
            const metaDate = estimarMeta(j)
            return (
              <div key={j.protocolo} className="flex items-center gap-2 text-xs">
                <span className="text-sm">{proto?.icone}</span>
                <span
                  className="rounded px-1.5 py-0.5 font-bold text-white text-[10px]"
                  style={{ backgroundColor: proto?.cor ?? '#6b7280' }}
                >
                  {j.protocolo}
                </span>
                <span className="text-slate-600">{j.percentual_conclusao}%</span>
                {metaDate && (
                  <span className="text-slate-400">· meta est. {metaDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* JornadaTimeline for each protocol */}
      <div className="space-y-4">
        {jornadas.map(j => {
          const proto = PROTOCOLO_MAP.get(j.protocolo)
          if (!proto) return null
          return (
            <JornadaTimeline
              key={j.protocolo}
              statusJornada={j}
              protocolo={proto}
              profissionalNome={demoProfissional.nome}
              onAgendarConsulta={() => onAgendarConsulta(j.protocolo)}
            />
          )
        })}
      </div>

      {/* Step advancement history */}
      {historicoPassos.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Histórico de Avanços de Passo</h3>
          <div className="space-y-2">
            {historicoPassos.map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-slate-400 w-24 shrink-0">
                  {h.data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: h.proto?.cor ?? '#6b7280' }}
                >
                  {h.protocolo}
                </span>
                <div className="flex items-center gap-1 text-slate-600">
                  <span className="font-semibold">Passo {h.passo}</span>
                  <span className="text-slate-400">—</span>
                  <span>{h.proto?.passos_fluxo.find(p => p.numero === h.passo)?.titulo ?? `Passo ${h.passo}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estimated goals summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4">Estimativa de Atingimento de Metas</h3>
        <div className="space-y-3">
          {jornadas.map(j => {
            const proto = PROTOCOLO_MAP.get(j.protocolo)
            const metaDate = estimarMeta(j)
            const passosRestantes = (PROTOCOLO_MAP.get(j.protocolo)?.passos_fluxo.length ?? 5) - j.passo_atual
            const metaAtingida = passosRestantes <= 0 && j.acoes_pendentes.length === 0

            return (
              <div key={j.protocolo} className="flex items-center gap-3">
                <span className="text-xl shrink-0">{proto?.icone}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{proto?.nome}</span>
                    {metaAtingida ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        🏆 Meta atingida
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {passosRestantes} passo{passosRestantes !== 1 ? 's' : ''} restante{passosRestantes !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {!metaAtingida && metaDate && (
                    <p className="text-xs text-slate-400">
                      Estimativa de conclusão: <span className="font-medium text-slate-600">
                        {metaDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      {j.alerta_estagnacao && (
                        <span className="ml-2 text-amber-600 font-medium">⚠ Pode atrasar — paciente estagnado</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold" style={{ color: proto?.cor }}>{j.percentual_conclusao}%</p>
                  <p className="text-[10px] text-slate-400">concluído</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Normalizadores ──────────────────────────────────────────────────────────
//
// Postgres pode retornar null em campos onde o schema esperava DEFAULT
// quando a linha foi inserida antes da coluna existir, ou se um cliente
// passou null explícito. Normalizamos no boundary (fetch) para que o resto
// do componente trabalhe com tipos não-nulos.

function normalizarPaciente(p: Paciente | null): Paciente | null {
  if (!p) return null
  return {
    ...p,
    nome: p.nome ?? '',
    matricula: p.matricula ?? '',
    setor: p.setor ?? undefined,
    comorbidades: Array.isArray(p.comorbidades) ? p.comorbidades : [],
    medicamentos_uso: p.medicamentos_uso ?? undefined,
    tabagismo_status: p.tabagismo_status ?? undefined,
  }
}

function normalizarLinhas(linhas: LinhaCuidado[]): LinhaCuidado[] {
  return linhas
    .filter(l => l && typeof l.protocolo_codigo === 'string')
    .map(l => ({
      ...l,
      status: l.status ?? 'ativo',
      // nivel_gravidade pode ser null — deixamos como undefined pra simplificar guards
      nivel_gravidade: l.nivel_gravidade ?? undefined,
    }))
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS_VALIDAS = ['resumo', 'jornada', 'consultas', 'evolucao', 'escalas', 'exames', 'alertas'] as const
type TabValue = typeof TABS_VALIDAS[number]

function tabFromQuery(raw: string | null): TabValue {
  if (raw && (TABS_VALIDAS as readonly string[]).includes(raw)) return raw as TabValue
  return 'resumo'
}

export default function PacientePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string

  // Aba inicial vinda do query (?tab=escalas etc.). Lemos uma vez no mount —
  // useState initializer resolve antes do primeiro render, sem setState em effect.
  const [tabAtual, setTabAtual] = useState<TabValue>(() => tabFromQuery(searchParams?.get('tab') ?? null))
  const abrirAgendarNoMount = (searchParams?.get('agendar') ?? '') === '1'

  const [jornadas, setJornadas] = useState<StatusJornada[]>([])
  const [jornadasCarregando, setJornadasCarregando] = useState(true)

  const pacientesRuntime = useRuntimeStore((s) => s.pacientes)
  const linhasRuntime = useRuntimeStore((s) => s.linhas)

  const [supabasePaciente, setSupabasePaciente] = useState<Paciente | null>(null)
  const [supabaseLinhas, setSupabaseLinhas] = useState<LinhaCuidado[]>([])
  const [carregandoPaciente, setCarregandoPaciente] = useState(!IS_DEMO_MODE)
  const [editarAberto, setEditarAberto] = useState(false)
  const [adicionarLinhaAberto, setAdicionarLinhaAberto] = useState(false)
  const [agendarAberto, setAgendarAberto] = useState<{ protocoloSugerido?: string } | null>(
    () => (abrirAgendarNoMount ? {} : null),
  )

  useEffect(() => {
    if (IS_DEMO_MODE || !id) return
    let cancelado = false
    const supabase = createClient()
    ;(async () => {
      const { data: pac, error: errP } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (errP) console.error('[Paciente] fetch:', errP)

      const { data: lins, error: errL } = await supabase
        .from('linhas_cuidado')
        .select('*')
        .eq('paciente_id', id)
      if (errL) console.error('[Paciente] fetch linhas:', errL)

      if (!cancelado) {
        setSupabasePaciente(normalizarPaciente(pac as Paciente | null))
        setSupabaseLinhas(normalizarLinhas((lins ?? []) as LinhaCuidado[]))
        setCarregandoPaciente(false)
      }
    })()
    return () => { cancelado = true }
  }, [id])

  // Compute jornadas async on mount (sempre chamado para respeitar rules-of-hooks)
  useEffect(() => {
    if (!id) return
    setJornadasCarregando(true)
    const linhasAtivas = (supabaseLinhas.length > 0
      ? [...supabaseLinhas, ...linhasRuntime]
      : [...demoLinhas, ...linhasRuntime]
    ).filter(l => l.paciente_id === id && l.status === 'ativo')
    const historicoConsultas = demoConsultas.filter(c => c.paciente_id === id)
    const historicoExames = getExamesByPaciente(id)

    Promise.all(linhasAtivas.map(async (linha) => {
      const evolucoes = demoEvolucoes
        .filter(e => e.paciente_id === id && e.protocolo_codigo === linha.protocolo_codigo)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const ultima = evolucoes[0]
      const historico = historicoConsultas.map(c => {
        const ev = demoEvolucoes.find(e => e.consulta_id === c.id && e.protocolo_codigo === linha.protocolo_codigo)
        return { ...c, passo_protocolo: ev?.passo_protocolo, metricas: ev?.metricas ?? {} }
      })
      const metricas = {
        ...((ultima?.metricas ?? {}) as Record<string, any>),
        passo_protocolo: ultima?.passo_protocolo ?? (linha.nivel_gravidade === 'controlado' ? 5 : linha.nivel_gravidade === 'parcial' ? 3 : 2),
      }
      return calcularJornada(id, linha.protocolo_codigo, metricas, historico, historicoExames)
    })).then(results => {
      setJornadas(results)
      setJornadasCarregando(false)
    })
  }, [id, linhasRuntime, supabaseLinhas])

  const paciente =
    supabasePaciente ??
    demoPacientes.find(p => p.id === id) ??
    pacientesRuntime.find(p => p.id === id)

  if (!paciente) {
    if (carregandoPaciente) {
      return (
        <div className="flex min-h-[400px] items-center justify-center text-sm text-slate-400">
          <span className="animate-spin mr-2">⏳</span> Carregando paciente…
        </div>
      )
    }
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-500">
        Paciente não encontrado.
      </div>
    )
  }

  const linhas = (supabaseLinhas.length > 0 ? supabaseLinhas : [...demoLinhas, ...linhasRuntime])
    .filter(l => l.paciente_id === id && l.status === 'ativo')
  const consultas = getConsultasByPaciente(id)
  const exames = getExamesByPaciente(id)
  const alertas = getAlertasByPaciente(id)
  const idade = calcularIdade(paciente.data_nascimento)

  // Dados para gráficos de evolução
  const evolucaoPAData = consultas
    .filter(c => c.pa_sistolica)
    .map(c => ({
      data: new Date(c.data_consulta).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      sistolica: c.pa_sistolica,
      diastolica: c.pa_diastolica,
    }))
    .reverse()

  const evolucaoPesoData = consultas
    .filter(c => c.peso)
    .map(c => ({
      data: new Date(c.data_consulta).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      peso: c.peso,
      imc: c.imc,
    }))
    .reverse()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg sm:text-xl font-bold text-white">
            {(paciente.nome ?? '').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{paciente.nome ?? '—'}</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {formatMatricula(paciente.matricula)} · {idade} anos · {paciente.setor?.trim() || 'Setor não informado'}
              {paciente.tabagismo_status === 'atual' && ' · 🚬 Tabagista'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {linhas.map(l => {
                const prot = PROTOCOLO_MAP.get(l.protocolo_codigo)
                return (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: prot?.cor ?? '#6b7280' }}
                  >
                    {prot?.icone} {l.protocolo_codigo}
                    {l.nivel_gravidade && (
                      <StatusPill status={l.nivel_gravidade} size="sm" className="ml-1" />
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center lg:gap-2">
          <Button
            variant="outline"
            onClick={() => setEditarAberto(true)}
            className="gap-1.5 w-full lg:w-auto"
          >
            ✏️ <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setAgendarAberto({})}
            className="gap-1.5 w-full lg:w-auto"
          >
            📅 <span className="hidden sm:inline">Agendar</span>
          </Button>
          <Link href={`/pacientes/${id}/consulta`} className="w-full lg:w-auto">
            <Button className="w-full bg-blue-600 hover:bg-blue-500 gap-2 lg:w-auto">
              📋 <span className="hidden sm:inline">Nova Consulta</span>
              <span className="sm:hidden">Consulta</span>
            </Button>
          </Link>
        </div>
      </div>

      <EditarPacienteModal
        aberto={editarAberto}
        onFechar={() => setEditarAberto(false)}
        paciente={paciente}
        onAtualizado={(p) => setSupabasePaciente(p)}
      />

      <AdicionarLinhaModal
        aberto={adicionarLinhaAberto}
        onFechar={() => setAdicionarLinhaAberto(false)}
        pacienteId={id}
        pacienteNome={paciente.nome ?? ''}
        profissionalId={demoProfissional.id}
        protocolosJaAtivos={linhas.filter(l => l.status === 'ativo').map(l => l.protocolo_codigo).filter(Boolean)}
        onAdicionado={(linha) => setSupabaseLinhas(prev => [...prev, linha])}
      />

      <AgendarConsultaModal
        aberto={agendarAberto !== null}
        onFechar={() => setAgendarAberto(null)}
        pacienteId={id}
        pacienteNome={paciente.nome ?? ''}
        protocolosAtivos={linhas.filter(l => l.status === 'ativo').map(l => l.protocolo_codigo).filter(Boolean)}
        protocoloSugerido={agendarAberto?.protocoloSugerido}
        profissionalId={demoProfissional.id}
        onAgendado={() => {
          // Em modo real o realtime channel do dashboard atualiza a agenda;
          // aqui só fechamos o modal — toast é disparado dentro do modal.
        }}
      />

      {/* Painel IA — apoio à decisão clínica */}
      <IAClinicalPanel
        pacienteId={id}
        entrada={{
          paciente: {
            nome: paciente.nome,
            idade,
            sexo: paciente.sexo,
            setor: paciente.setor,
            comorbidades: paciente.comorbidades,
            medicamentos_uso: paciente.medicamentos_uso,
            tabagismo_status: paciente.tabagismo_status,
          },
          protocolos: linhas.map(l => ({
            codigo: l.protocolo_codigo,
            nome: PROTOCOLO_MAP.get(l.protocolo_codigo)?.nome,
            nivel_gravidade: l.nivel_gravidade,
          })),
          sinaisVitais: consultas[0]
            ? {
                pa_sistolica: consultas[0].pa_sistolica,
                pa_diastolica: consultas[0].pa_diastolica,
                fc: consultas[0].fc,
                spo2: consultas[0].spo2,
                peso: consultas[0].peso,
                imc: consultas[0].imc,
              }
            : undefined,
        }}
      />

      {/* Tabs */}
      <Tabs value={tabAtual} onValueChange={(v) => setTabAtual(v as TabValue)}>
        <div className="border-b border-slate-200 -mx-4 md:-mx-6 lg:mx-0 overflow-x-auto">
          <TabsList className="w-max min-w-full justify-start bg-transparent rounded-none p-0 gap-0 h-auto px-4 md:px-6 lg:px-0">
            {['resumo', 'jornada', 'consultas', 'evolucao', 'escalas', 'exames', 'alertas'].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="shrink-0 rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2 text-sm font-medium text-slate-500 capitalize data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent"
              >
                {tab === 'resumo' ? 'Resumo' :
                 tab === 'jornada' ? '🗺️ Jornada' :
                 tab === 'consultas' ? 'Consultas' :
                 tab === 'evolucao' ? 'Evolução' :
                 tab === 'escalas' ? '📊 Escalas' :
                 tab === 'exames' ? 'Exames' : 'Alertas'}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Jornada */}
        <TabsContent value="jornada" className="pt-4">
          <JornadaTab
            jornadas={jornadas}
            carregando={jornadasCarregando}
            pacienteId={id}
            linhas={linhas}
            onAdicionarLinha={() => setAdicionarLinhaAberto(true)}
            onAgendarConsulta={(proto) => setAgendarAberto({ protocoloSugerido: proto })}
          />
        </TabsContent>

        {/* Resumo */}
        <TabsContent value="resumo" className="pt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 font-semibold text-slate-700">Dados Pessoais</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Data nascimento</dt>
                  <dd className="font-medium">{new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Sexo</dt>
                  <dd className="font-medium">{paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Feminino' : 'Outro'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Setor</dt>
                  <dd className="font-medium">{paciente.setor?.trim() ? paciente.setor : <span className="text-slate-400">Não informado</span>}</dd>
                </div>
                {paciente.tabagismo_status && paciente.tabagismo_status !== 'nunca' && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Tabagismo</dt>
                    <dd className="font-medium">{paciente.tabagismo_status === 'atual' ? 'Fumante' : 'Ex-fumante'}{paciente.tabagismo_macos_ano ? ` · ${paciente.tabagismo_macos_ano} maços-ano` : ''}</dd>
                  </div>
                )}
                {paciente.medicamentos_uso && (
                  <div>
                    <dt className="text-slate-500 mb-1">Medicamentos</dt>
                    <dd className="text-xs bg-slate-50 rounded p-2">{paciente.medicamentos_uso}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 font-semibold text-slate-700">Protocolos Ativos</h3>
              <div className="space-y-3">
                {linhas.map(l => {
                  const prot = PROTOCOLO_MAP.get(l.protocolo_codigo)
                  if (!prot) return null
                  return (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{prot.icone}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{prot.nome}</p>
                          <p className="text-xs text-slate-400">{l.protocolo_codigo}</p>
                        </div>
                      </div>
                      {l.nivel_gravidade && <StatusPill status={l.nivel_gravidade} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Consultas */}
        <TabsContent value="consultas" className="pt-4">
          <div className="space-y-3">
            {consultas.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Nenhuma consulta registrada.</p>
            )}
            {consultas.map(c => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {new Date(c.data_consulta).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{c.tipo}</p>
                  </div>
                  <div className="flex gap-1">
                    {c.protocolos_abordados.map(cod => {
                      const p = PROTOCOLO_MAP.get(cod)
                      return (
                        <span key={cod} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: p?.cor ?? '#6b7280' }}>{cod}</span>
                      )
                    })}
                  </div>
                </div>
                {c.pa_sistolica && <p className="text-xs text-slate-500">PA {c.pa_sistolica}/{c.pa_diastolica} mmHg · FC {c.fc} bpm · SpO₂ {c.spo2}%</p>}
                {c.subjetivo && <p className="mt-2 text-sm text-slate-600"><strong>S:</strong> {c.subjetivo}</p>}
                {c.avaliacao && <p className="mt-1 text-sm text-slate-600"><strong>A:</strong> {c.avaliacao}</p>}
                {c.plano && <p className="mt-1 text-sm text-slate-600"><strong>P:</strong> {c.plano}</p>}
                {c.data_proximo_retorno && (
                  <p className="mt-2 text-xs text-blue-600 font-medium">
                    Próximo retorno: {new Date(c.data_proximo_retorno).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Evolução */}
        <TabsContent value="evolucao" className="pt-4 space-y-6">
          <EvolucaoPROMs consultas={consultas} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {evolucaoPAData.length >= 1 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 font-semibold text-slate-700">Pressão Arterial (mmHg)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={evolucaoPAData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                    <YAxis domain={[60, 200]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sistolica" stroke="#C0392B" strokeWidth={2} dot name="Sistólica" />
                    <Line type="monotone" dataKey="diastolica" stroke="#E74C3C" strokeWidth={2} strokeDasharray="4 4" dot name="Diastólica" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {evolucaoPesoData.length >= 1 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 font-semibold text-slate-700">Peso (kg) e IMC</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={evolucaoPesoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="peso" stroke="#7C3AED" strokeWidth={2} dot name="Peso (kg)" />
                    <Line type="monotone" dataKey="imc" stroke="#A78BFA" strokeWidth={2} strokeDasharray="4 4" dot name="IMC" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {evolucaoPAData.length === 0 && evolucaoPesoData.length === 0 && (
              <p className="col-span-2 py-8 text-center text-sm text-slate-400">
                Dados insuficientes para gráficos. Realize mais consultas.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Escalas */}
        <TabsContent value="escalas" className="pt-4">
          <HistoricoEscalas
            pacienteId={id}
            pacienteNome={paciente.nome ?? ''}
            protocolosAtivos={linhas.map(l => l.protocolo_codigo).filter(Boolean)}
            consultas={consultas}
            profissionalNome={demoProfissional.nome}
            empresaId={paciente.empresa_id}
            profissionalId={demoProfissional.id}
          />
        </TabsContent>

        {/* Exames */}
        <TabsContent value="exames" className="pt-4">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3 text-left">Exame</th>
                  <th className="px-4 py-3 text-left">Resultado</th>
                  <th className="px-4 py-3 text-left">Data coleta</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exames.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum exame registrado.</td></tr>
                )}
                {exames.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{e.nome_exame}</td>
                    <td className="px-4 py-3 text-slate-600">{e.resultado ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(e.data_coleta).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === 'resultado_disponivel' ? 'bg-emerald-100 text-emerald-700' :
                        e.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                        e.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {e.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alertas" className="pt-4">
          <div className="space-y-2">
            {alertas.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">Nenhum alerta ativo. ✅</p>
            )}
            {alertas.map(a => (
              <AlertaItem key={a.id} alerta={a} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
