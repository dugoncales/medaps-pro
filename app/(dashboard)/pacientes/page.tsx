'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { demoPacientes, demoLinhas, demoConsultas, calcularIdade, getControleGeral, getProximoRetorno } from '@/lib/demo-data'
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

  const rows = useMemo(() => {
    return demoPacientes
      .filter(p => {
        const q = busca.toLowerCase()
        if (q && !p.nome.toLowerCase().includes(q) && !p.matricula.toLowerCase().includes(q)) return false

        const linhasPac = demoLinhas.filter(l => l.paciente_id === p.id && l.status === 'ativo')
        if (filtroProtocolo && !linhasPac.some(l => l.protocolo_codigo === filtroProtocolo)) return false

        if (filtroStatus) {
          const { pct } = getControleGeral(linhasPac)
          const st: StatusControle = pct >= 80 ? 'controlado' : pct >= 50 ? 'parcial' : 'descontrolado'
          if (st !== filtroStatus) return false
        }

        return true
      })
      .map(p => {
        const linhas = demoLinhas.filter(l => l.paciente_id === p.id && l.status === 'ativo')
        const consultas = demoConsultas.filter(c => c.paciente_id === p.id)
        const controle = getControleGeral(linhas)
        const ultima = consultas.sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime())[0]
        const proximo = getProximoRetorno(consultas)
        const retornoStatus = getRetornoStatus(proximo)
        const status: StatusControle = controle.pct >= 80 ? 'controlado' : controle.pct >= 50 ? 'parcial' : 'descontrolado'
        return { p, linhas, ultima, proximo, retornoStatus, controle, status }
      })
  }, [busca, filtroProtocolo, filtroStatus])

  const totalPaginas = Math.ceil(rows.length / ROWS_PER_PAGE)
  const paginados = rows.slice((pagina - 1) * ROWS_PER_PAGE, pagina * ROWS_PER_PAGE)

  const protocoosUnicos = [...new Set(demoLinhas.map(l => l.protocolo_codigo))]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pacientes</h1>
          <p className="text-sm text-slate-500">{demoPacientes.length} colaboradores em linha de cuidado</p>
        </div>
        <Link href="/pacientes/novo">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-500">
            <span>＋</span> Novo Paciente
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome ou matrícula…"
          value={busca}
          onChange={e => { setBusca(e.target.value); setPagina(1) }}
          className="w-64"
        />
        <select
          value={filtroProtocolo}
          onChange={e => { setFiltroProtocolo(e.target.value); setPagina(1) }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os protocolos</option>
          {protocoosUnicos.map(cod => (
            <option key={cod} value={cod}>{cod} — {PROTOCOLO_MAP.get(cod)?.nome}</option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={e => { setFiltroStatus(e.target.value as StatusControle | ''); setPagina(1) }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="controlado">Controlado</option>
          <option value="parcial">Parcial</option>
          <option value="descontrolado">Descontrolado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3 text-left">Paciente / Idade</th>
                <th className="px-4 py-3 text-left">Setor</th>
                <th className="px-4 py-3 text-left">Protocolos Ativos</th>
                <th className="px-4 py-3 text-left">Controle</th>
                <th className="px-4 py-3 text-left">Última Consulta</th>
                <th className="px-4 py-3 text-left">Próx. Retorno</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginados.map(({ p, linhas, ultima, proximo, retornoStatus, status }) => (
                <tr
                  key={p.id}
                  className={cn(
                    'hover:bg-slate-50 transition-colors',
                    retornoStatus === 'vencido' && 'bg-red-50/40',
                    retornoStatus === 'proximo' && 'bg-amber-50/40'
                  )}
                >
                  <td className="px-4 py-3">
                    <Link href={`/pacientes/${p.id}`} className="hover:text-blue-600">
                      <div className="font-semibold text-slate-800">{p.nome}</div>
                      <div className="text-xs text-slate-400">{p.matricula} · {calcularIdade(p.data_nascimento)} anos</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.setor}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {linhas.map(l => {
                        const prot = PROTOCOLO_MAP.get(l.protocolo_codigo)
                        return (
                          <span
                            key={l.id}
                            className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: prot?.cor ?? '#6b7280' }}
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
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {ultima ? new Date(ultima.data_consulta).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {proximo ? (
                      <span className={cn(
                        'text-xs font-medium',
                        retornoStatus === 'vencido' ? 'text-red-600' :
                        retornoStatus === 'proximo' ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {retornoStatus === 'vencido' ? '🔴 ' : retornoStatus === 'proximo' ? '🟡 ' : '🟢 '}
                        {new Date(proximo).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/pacientes/${p.id}/consulta`}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                    >
                      Atender
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Exibindo {(pagina - 1) * ROWS_PER_PAGE + 1}–{Math.min(pagina * ROWS_PER_PAGE, rows.length)} de {rows.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                ← Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPagina(n)}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium',
                    n === pagina ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
