'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { StatusJornada, AcaoPendente } from '@/lib/jornada/motor'
import type { Protocolo } from '@/lib/protocolos'
import { resolverAcao } from '@/lib/jornada/acao-resolver'
import { AcaoExecucaoModal, type AcaoModalModo } from '@/components/jornada/AcaoExecucaoModal'

// ─── Props ────────────────────────────────────────────────────────────────────

interface JornadaTimelineProps {
  statusJornada: StatusJornada
  protocolo: Protocolo
  /** Nome do profissional logado — pré-preenche o modal de execução. */
  profissionalNome?: string
  onAvancarPasso?: () => void
  onAgendarConsulta?: () => void
  className?: string
}

// Chave estável para identificar uma ação dentro da lista (sem id no tipo).
function acaoKey(a: AcaoPendente): string {
  return `${a.protocolo}|${a.passo}|${a.titulo}`
}

// ─── Step status helpers ──────────────────────────────────────────────────────

type StepStatus = 'done' | 'current' | 'future'

function getStepStatus(stepNum: number, passoAtual: number, totalPassos: number): StepStatus {
  if (stepNum < passoAtual) return 'done'
  if (stepNum === passoAtual) return 'current'
  return 'future'
}

// ─── Ação icon/colors ─────────────────────────────────────────────────────────

const TIPO_ICON: Record<AcaoPendente['tipo'], string> = {
  consulta:       '🩺',
  exame:          '🧪',
  escala:         '📋',
  encaminhamento: '➡️',
  medicacao:      '💊',
  vacina:         '💉',
}

const PRIORIDADE_CLASS: Record<AcaoPendente['prioridade'], string> = {
  urgente: 'border-l-red-500 bg-red-50',
  alta:    'border-l-orange-500 bg-orange-50',
  media:   'border-l-amber-400 bg-amber-50',
  baixa:   'border-l-slate-300 bg-slate-50',
}

const PRIORIDADE_LABEL: Record<AcaoPendente['prioridade'], { label: string; className: string }> = {
  urgente: { label: 'Urgente',  className: 'bg-red-100 text-red-700' },
  alta:    { label: 'Alta',     className: 'bg-orange-100 text-orange-700' },
  media:   { label: 'Média',    className: 'bg-amber-100 text-amber-700' },
  baixa:   { label: 'Baixa',    className: 'bg-slate-100 text-slate-600' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AcaoPendenteItem({
  acao,
  pacienteId,
  onAbrirModal,
}: {
  acao: AcaoPendente
  pacienteId: string
  onAbrirModal: (modo: AcaoModalModo, acao: AcaoPendente) => void
}) {
  const destino = resolverAcao(pacienteId, acao)

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border-l-4 p-3 text-sm transition-shadow',
        'hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]',
        PRIORIDADE_CLASS[acao.prioridade],
      )}
    >
      <span className="mt-0.5 shrink-0 text-base">{TIPO_ICON[acao.tipo]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-800">{acao.titulo}</span>
          {acao.bloqueante && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white">BLOQUEANTE</span>
          )}
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', PRIORIDADE_LABEL[acao.prioridade].className)}>
            {PRIORIDADE_LABEL[acao.prioridade].label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{acao.descricao}</p>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          {acao.prazo_dias > 0 ? (
            <p className="text-[11px] text-slate-400">
              ⏱ Realizar em até {acao.prazo_dias} dia{acao.prazo_dias !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-[11px] font-semibold text-red-500">⏱ Realizar hoje</p>
          )}
          <Link
            href={destino.href}
            className="text-[11px] font-medium text-blue-700 opacity-70 hover:opacity-100 hover:underline"
          >
            {destino.cta}
          </Link>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onAbrirModal('executar', acao)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            ✅ Registrar execução
          </button>
          <button
            type="button"
            onClick={() => onAbrirModal('justificar', acao)}
            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            ⚠️ Justificar não execução
          </button>
        </div>
      </div>
    </div>
  )
}

function StepCircle({ status, cor, num }: { status: StepStatus; cor: string; num: number }) {
  if (status === 'done') {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
        style={{ backgroundColor: cor }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }

  if (status === 'current') {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold shadow-md ring-4 ring-white"
        style={{ borderColor: cor, color: cor, backgroundColor: `${cor}15` }}
      >
        {num}
      </div>
    )
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400"
      title="Bloqueado — conclua a etapa anterior"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c.83 0 1.5.67 1.5 1.5S12.83 14 12 14s-1.5-.67-1.5-1.5S11.17 11 12 11zm6-3h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
      </svg>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JornadaTimeline({ statusJornada, protocolo, profissionalNome, onAvancarPasso, onAgendarConsulta, className }: JornadaTimelineProps) {
  const [expandido, setExpandido] = useState(true)
  const [acoesResolvidas, setAcoesResolvidas] = useState<Set<string>>(() => new Set())
  const [modalState, setModalState] = useState<{ modo: AcaoModalModo; acao: AcaoPendente } | null>(null)
  const {
    paciente_id,
    passo_atual, percentual_conclusao, acoes_pendentes, acoes_concluidas,
    proximo_passo, status_controle, dias_no_passo_atual, alerta_estagnacao,
    data_prevista_avanco, alerta_estagnacao: estagnado,
  } = statusJornada

  // Filtra ações já resolvidas localmente — UI otimista até o próximo refetch.
  const acoesPendentesVisiveis = acoes_pendentes.filter(a => !acoesResolvidas.has(acaoKey(a)))

  const cor = protocolo.cor
  const totalPassos = protocolo.passos_fluxo.length
  const bloqueantesAtivos = acoesPendentesVisiveis.filter(a => a.bloqueante).length
  const podaAvancar = bloqueantesAtivos === 0 && passo_atual < totalPassos
  const metaAtingida = passo_atual >= totalPassos && acoesPendentesVisiveis.length === 0
  const passoAtualInfo = protocolo.passos_fluxo.find(p => p.numero === passo_atual)
  const tituloPassoAtual = passoAtualInfo?.titulo ?? `Passo ${passo_atual}`

  const statusCtrlCls = {
    controlado:   'bg-emerald-100 text-emerald-700',
    parcial:      'bg-amber-100 text-amber-700',
    descontrolado:'bg-red-100 text-red-700',
  }[status_controle]

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {/* Header */}
      <button
        onClick={() => setExpandido(v => !v)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors rounded-xl"
      >
        <span className="text-2xl leading-none">{protocolo.icone}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm">{protocolo.nome}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', statusCtrlCls)}>
              {status_controle === 'controlado' ? 'Controlado' : status_controle === 'parcial' ? 'Parcial' : 'Descontrolado'}
            </span>
            {alerta_estagnacao && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                ⚠ Estagnado {dias_no_passo_atual}d
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percentual_conclusao}%`, backgroundColor: cor }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
              Passo {passo_atual}/{totalPassos} · {percentual_conclusao}%
            </span>
          </div>
        </div>
        <svg
          className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform mt-1', expandido && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandido && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {/* Meta badge */}
          {metaAtingida && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-bold text-emerald-700">Meta atingida!</p>
                <p className="text-xs text-emerald-600">Protocolo concluído com sucesso.</p>
              </div>
            </div>
          )}

          {/* Stagnation alert */}
          {estagnado && !metaAtingida && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
              <span>⚠️</span>
              <p className="text-amber-700">
                <span className="font-semibold">{dias_no_passo_atual} dias</span> no passo atual — mais do que o dobro do tempo esperado.
                {data_prevista_avanco && (
                  <span className="text-amber-600"> Previsão de avanço era {data_prevista_avanco.toLocaleDateString('pt-BR')}.</span>
                )}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-0">
            {protocolo.passos_fluxo.map((passo, idx) => {
              const status = getStepStatus(passo.numero, passo_atual, totalPassos)
              const isLast = idx === protocolo.passos_fluxo.length - 1

              return (
                <div key={passo.numero} className="flex gap-3">
                  {/* Connector line + circle */}
                  <div className="flex flex-col items-center">
                    <StepCircle status={status} cor={cor} num={passo.numero} />
                    {!isLast && (
                      <div
                        className={cn('w-0.5 flex-1 my-1', status === 'done' ? 'min-h-[24px]' : 'min-h-[24px]')}
                        style={{ backgroundColor: status === 'done' ? cor : '#e2e8f0' }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn('pb-4 flex-1 min-w-0', isLast && 'pb-0')}>
                    {/* Step label */}
                    <div className="flex flex-wrap items-center gap-2 min-h-[32px]">
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          status === 'done'    && 'text-slate-500 line-through',
                          status === 'current' && 'text-slate-800',
                          status === 'future'  && 'text-slate-400',
                        )}
                      >
                        {passo.titulo}
                      </span>
                      {status === 'done' && (
                        <span className="text-[10px] font-medium rounded px-1.5 py-0.5 bg-emerald-100 text-emerald-600">
                          Concluído
                        </span>
                      )}
                      {status === 'current' && !metaAtingida && (
                        <span
                          className="text-[10px] font-bold rounded-full px-2 py-0.5 text-white"
                          style={{ backgroundColor: cor }}
                        >
                          Atual
                        </span>
                      )}
                    </div>

                    {/* Step description (current only — future shows lock message instead) */}
                    {status === 'current' && (
                      <p className="text-xs mt-0.5 leading-relaxed text-slate-500">
                        {passo.descricao}
                      </p>
                    )}

                    {/* Future step: locked message */}
                    {status === 'future' && (
                      <div className="mt-0.5 space-y-1">
                        <p className="text-xs leading-relaxed text-slate-400 line-clamp-2">
                          {passo.descricao}
                        </p>
                        <p className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c.83 0 1.5.67 1.5 1.5S12.83 14 12 14s-1.5-.67-1.5-1.5S11.17 11 12 11zm6-3h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                          </svg>
                          Bloqueado — conclua "{tituloPassoAtual}" primeiro
                        </p>
                      </div>
                    )}

                    {/* Pending actions for current step */}
                    {status === 'current' && acoesPendentesVisiveis.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Ações pendentes ({acoesPendentesVisiveis.length}) {bloqueantesAtivos > 0 && (
                            <span className="text-red-500 normal-case font-medium">
                              · {bloqueantesAtivos} bloqueante{bloqueantesAtivos > 1 ? 's' : ''} para avançar
                            </span>
                          )}
                        </p>
                        {acoesPendentesVisiveis.map((acao) => (
                          <AcaoPendenteItem
                            key={acaoKey(acao)}
                            acao={acao}
                            pacienteId={paciente_id}
                            onAbrirModal={(modo, a) => setModalState({ modo, acao: a })}
                          />
                        ))}
                      </div>
                    )}

                    {/* Advance + schedule buttons */}
                    {status === 'current' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {podaAvancar && onAvancarPasso && (
                          <button
                            onClick={onAvancarPasso}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-90"
                            style={{ backgroundColor: cor }}
                          >
                            ✓ Concluir e avançar para "{proximo_passo}" →
                          </button>
                        )}
                        {!podaAvancar && bloqueantesAtivos > 0 && passo_atual < totalPassos && (
                          <span
                            className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed"
                            title="Resolva os itens bloqueantes para liberar o próximo passo"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c.83 0 1.5.67 1.5 1.5S12.83 14 12 14s-1.5-.67-1.5-1.5S11.17 11 12 11zm6-3h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                            </svg>
                            Próximo passo bloqueado
                          </span>
                        )}
                        {onAgendarConsulta && (
                          <button
                            onClick={onAgendarConsulta}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            📅 Agendar consulta
                          </button>
                        )}
                      </div>
                    )}

                    {/* All done for current step — no pending */}
                    {status === 'current' && acoesPendentesVisiveis.length === 0 && !metaAtingida && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Todos os critérios deste passo foram cumpridos.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer info */}
          {data_prevista_avanco && !metaAtingida && (
            <div className="mt-4 border-t border-slate-100 pt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>📅</span>
              <span>
                Previsão de avanço para "{proximo_passo}":&nbsp;
                <span className="font-medium text-slate-500">
                  {data_prevista_avanco.toLocaleDateString('pt-BR')}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {modalState && (
        <AcaoExecucaoModal
          aberto
          modo={modalState.modo}
          acao={modalState.acao}
          pacienteId={paciente_id}
          profissionalNomeDefault={profissionalNome ?? ''}
          onFechar={() => setModalState(null)}
          onConfirmado={() => {
            setAcoesResolvidas(prev => {
              const next = new Set(prev)
              next.add(acaoKey(modalState.acao))
              return next
            })
          }}
        />
      )}
    </div>
  )
}
