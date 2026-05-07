'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { demoPacientes, demoLinhas, demoConsultas, calcularIdade, getControleGeral, getProximoRetorno, IS_DEMO_MODE } from '@/lib/demo-data'
import { useRuntimeStore } from '@/lib/store/runtime-store'
import { createClient } from '@/lib/supabase/client'
import type { Paciente, LinhaCuidado } from '@/types'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { StatusPill } from '@/components/shared/StatusPill'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { StatusControle } from '@/types'
import { cn } from '@/lib/utils'

const ROWS_PER_PAGE = 10

function getRetornoStatus(proximo: string | null): 'vencido' | 'proximo' | 'ok' | null {
  if (!proximo) return null
  const diff = (new Date(proximo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'vencido'
  if (diff <= 14) return 'proximo'
  return 'ok'
}

export default function PacientesPage() {
  const [busca, setBusca] = useState('')
  const [filtroProtocolo, setFiltroProtocolo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusControle | ''>('')
  const [pagina, setPagina] = useState(1)

  const pacientesRuntime = useRuntimeStore((s) => s.pacientes)
  const linhasRuntime = useRuntimeStore((s) => s.linhas)

  const [supabasePacientes, setSupabasePacientes] = useState<Paciente[]>([])
  const [supabaseLinhas, setSupabaseLinhas] = useState<LinhaCuidado[]>([])

  useEffect(() => {
    if (IS_DEMO_MODE) return
    const supabase = createClient()
    let cancelado = false
    ;(async () => {
      const { data: pacs, error: errP } = await supabase
        .from('pacientes')
        .select('*')
        .eq('ativo', true)
      if (errP) { console.error('[Pacientes] fetch:', errP); return }
      const { data: lins, error: errL } = await supabase
        .from('linhas_cuidado')
        .select('*')
        .eq('status', 'ativo')
      if (errL) { console.error('[Pacientes] fetch linhas:', errL); return }
      if (!cancelado) {
        setSupabasePacientes((pacs ?? []) as Paciente[])
        setSupabaseLinhas((lins ?? []) as LinhaCuidado[])
      }
    })()
    return () => { cancelado = true }
  }, [])

  // Dedup: se o Supabase já trouxer um paciente também presente no store local
  // (write-through cache do cadastro), preferimos a versão Supabase.
  const todosPacientes = useMemo(() => {
    const idsSupabase = new Set(supabasePacientes.map((p) => p.id))
    const runtime = pacientesRuntime.filter((p) => !idsSupabase.has(p.id))
    return IS_DEMO_MODE
      ? [...demoPacientes, ...runtime]
      : [...supabasePacientes, ...runtime]
  }, [pacientesRuntime, supabasePacientes])

  const todasLinhas = useMemo(() => {
    const idsSupabase = new Set(supabaseLinhas.map((l) => l.id))
    const runtime = linhasRuntime.filter((l) => !idsSupabase.has(l.id))
    return IS_DEMO_MODE
      ? [...demoLinhas, ...runtime]
      : [...supabaseLinhas, ...runtime]
  }, [linhasRuntime, supabaseLinhas])

  const rows = useMemo(() => {
    return todosPacientes
      .filter(p => {
        const q = busca.toLowerCase()
        if (q && !p.nome.toLowerCase().includes(q) && !p.matricula.toLowerCase().includes(q)) return false

        const linhasPac = todasLinhas.filter(l => l.paciente_id === p.id && l.status === 'ativo')
        if (filtroProtocolo && !linhasPac.some(l => l.protocolo_codigo === filtroProtocolo)) return false

        if (filtroStatus) {
          const { pct } = getControleGeral(linhasPac)
          const st: StatusControle = pct >= 80 ? 'controlado' : pct >= 50 ? 'parcial' : 'descontrolado'
          if (st !== filtroStatus) return false
        }

        return true
      })
      .map(p => {
        const linhas = todasLinhas.filter(l => l.paciente_id === p.id && l.status === 'ativo')
        const consultas = demoConsultas.filter(c => c.paciente_id === p.id)
        const controle = getControleGeral(linhas)
        const ultima = consultas.sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime())[0]
        const proximo = getProximoRetorno(consultas)
        const retornoStatus = getRetornoStatus(proximo)
        const status: StatusControle = controle.pct >= 80 ? 'controlado' : controle.pct >= 50 ? 'parcial' : 'descontrolado'
        return { p, linhas, ultima, proximo, retornoStatus, controle, status }
      })
  }, [busca, filtroProtocolo, filtroStatus, todosPacientes, todasLinhas])

  const totalPaginas = Math.ceil(rows.length / ROWS_PER_PAGE)
  const paginados = rows.slice((pagina - 1) * ROWS_PER_PAGE, pagina * ROWS_PER_PAGE)

  const protocoosUnicos = [...new Set(todasLinhas.map(l => l.protocolo_codigo))]

  function getInitials(nome: string) {
    return nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
  }

  function getAvatarColor(id: string) {
    const palette = ['#1E40AF', '#0891B2', '#7C3AED', '#059669', '#D97706', '#DC2626', '#9333EA', '#0D9488']
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
    return palette[Math.abs(hash) % palette.length]
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#111827]">Pacientes</h1>
          <p className="text-sm text-[#6B7280] mt-0.5 truncate">{todosPacientes.length} colaboradores em linha de cuidado</p>
        </div>
        <Link href="/pacientes/novo" className="shrink-0">
          <Button className="gap-2">
            <span>＋</span>
            <span className="hidden sm:inline">Novo Paciente</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <Input
          placeholder="Buscar por nome ou matrícula…"
          value={busca}
          onChange={e => { setBusca(e.target.value); setPagina(1) }}
          className="w-full sm:w-64"
        />
        <select
          value={filtroProtocolo}
          onChange={e => { setFiltroProtocolo(e.target.value); setPagina(1) }}
          className="h-10 w-full sm:w-auto rounded-md border-[1.5px] border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] transition-shadow focus:outline-none focus:border-[#1E40AF] focus:ring-[3px] focus:ring-[#1E40AF]/15"
        >
          <option value="">Todos os protocolos</option>
          {protocoosUnicos.map(cod => (
            <option key={cod} value={cod}>{cod} — {PROTOCOLO_MAP.get(cod)?.nome}</option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={e => { setFiltroStatus(e.target.value as StatusControle | ''); setPagina(1) }}
          className="h-10 w-full sm:w-auto rounded-md border-[1.5px] border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] transition-shadow focus:outline-none focus:border-[#1E40AF] focus:ring-[3px] focus:ring-[#1E40AF]/15"
        >
          <option value="">Todos os status</option>
          <option value="controlado">Controlado</option>
          <option value="parcial">Parcial</option>
          <option value="descontrolado">Descontrolado</option>
        </select>
      </div>

      {/* Cards (mobile) */}
      <div className="space-y-2 md:hidden">
        {paginados.length === 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-8 text-center text-sm text-[#9CA3AF]">
            Nenhum paciente encontrado.
          </div>
        )}
        {paginados.map(({ p, linhas, ultima, proximo, retornoStatus, status }) => (
          <div
            key={p.id}
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
          >
            <Link href={`/pacientes/${p.id}`} className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: getAvatarColor(p.id) }}
              >
                {getInitials(p.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[#111827] truncate">{p.nome}</div>
                <div className="text-xs text-[#9CA3AF] mt-0.5">
                  {p.matricula} · {calcularIdade(p.data_nascimento)} anos
                  {p.setor?.trim() && <span> · {p.setor}</span>}
                </div>
              </div>
              <StatusPill status={status} size="sm" />
            </Link>

            {linhas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {linhas.map(l => {
                  const prot = PROTOCOLO_MAP.get(l.protocolo_codigo)
                  return (
                    <span
                      key={l.id}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: prot?.cor ?? '#6B7280' }}
                    >
                      {l.protocolo_codigo}
                    </span>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F1F5F9] text-xs">
              <div className="min-w-0 flex-1">
                <p className="text-[#9CA3AF]">Última: <span className="text-[#6B7280] num-tabular">{ultima ? new Date(ultima.data_consulta).toLocaleDateString('pt-BR') : '—'}</span></p>
                {proximo ? (
                  <p className={cn(
                    'mt-0.5 font-semibold num-tabular',
                    retornoStatus === 'vencido' ? 'text-[#DC2626]' :
                    retornoStatus === 'proximo' ? 'text-[#D97706]' : 'text-[#059669]'
                  )}>
                    Retorno: {new Date(proximo).toLocaleDateString('pt-BR')}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[#9CA3AF]">Sem retorno agendado</p>
                )}
              </div>
              <Link
                href={`/pacientes/${p.id}/consulta`}
                className="shrink-0 rounded-lg bg-[#1E40AF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors"
              >
                Atender
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela (desktop) */}
      <div className="hidden md:block rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7280]">
                <th className="px-4 py-3 text-left">Paciente</th>
                <th className="px-4 py-3 text-left">Setor</th>
                <th className="px-4 py-3 text-left">Protocolos Ativos</th>
                <th className="px-4 py-3 text-left">Controle</th>
                <th className="px-4 py-3 text-left">Última Consulta</th>
                <th className="px-4 py-3 text-left">Próx. Retorno</th>
                <th className="px-4 py-3 text-right pr-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {paginados.map(({ p, linhas, ultima, proximo, retornoStatus, status }) => (
                <tr
                  key={p.id}
                  className="hover:bg-[#F9FAFB] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link href={`/pacientes/${p.id}`} className="flex items-center gap-3 group">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                        style={{ backgroundColor: getAvatarColor(p.id) }}
                      >
                        {getInitials(p.nome)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#111827] group-hover:text-[#1E40AF] transition-colors truncate">{p.nome}</div>
                        <div className="text-xs text-[#9CA3AF]">{p.matricula} · {calcularIdade(p.data_nascimento)} anos</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{p.setor?.trim() ? p.setor : <span className="text-[#9CA3AF]">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {linhas.map(l => {
                        const prot = PROTOCOLO_MAP.get(l.protocolo_codigo)
                        return (
                          <span
                            key={l.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: prot?.cor ?? '#6B7280' }}
                          >
                            {l.protocolo_codigo}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs num-tabular">
                    {ultima ? new Date(ultima.data_consulta).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {proximo ? (
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-semibold num-tabular',
                        retornoStatus === 'vencido' ? 'text-[#DC2626]' :
                        retornoStatus === 'proximo' ? 'text-[#D97706]' : 'text-[#059669]'
                      )}>
                        <span className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          retornoStatus === 'vencido' ? 'bg-[#DC2626]' :
                          retornoStatus === 'proximo' ? 'bg-[#D97706]' : 'bg-[#059669]'
                        )} />
                        {new Date(proximo).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-[#9CA3AF]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 pr-5 text-right">
                    <Link
                      href={`/pacientes/${p.id}/consulta`}
                      className="inline-flex rounded-lg bg-[#1E40AF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] transition-colors"
                    >
                      Atender
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação (desktop) */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3">
            <p className="text-xs text-[#6B7280]">
              Exibindo <span className="font-semibold text-[#111827] num-tabular">{(pagina - 1) * ROWS_PER_PAGE + 1}–{Math.min(pagina * ROWS_PER_PAGE, rows.length)}</span> de <span className="font-semibold text-[#111827] num-tabular">{rows.length}</span>
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                ← Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPagina(n)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium num-tabular transition-colors',
                    n === pagina
                      ? 'bg-[#1E40AF] text-white'
                      : 'border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Paginação (mobile) */}
      {totalPaginas > 1 && (
        <div className="md:hidden flex items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7280] disabled:opacity-40 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-[#6B7280] num-tabular">
            Página <span className="font-semibold text-[#111827]">{pagina}</span> de <span className="font-semibold text-[#111827]">{totalPaginas}</span>
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7280] disabled:opacity-40 transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
