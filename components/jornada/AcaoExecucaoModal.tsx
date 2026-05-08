'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { useToastStore } from '@/lib/store/toast-store'
import type { AcaoPendente } from '@/lib/jornada/motor'

export type AcaoModalModo = 'executar' | 'justificar'

interface Props {
  aberto: boolean
  modo: AcaoModalModo
  acao: AcaoPendente
  pacienteId: string
  profissionalNomeDefault: string
  onFechar: () => void
  /** Chamado após persistência bem-sucedida — usado para esconder o item da lista. */
  onConfirmado: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hojeISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ─── Detecção do tipo da ação ────────────────────────────────────────────────
//
// O motor não classifica suficientemente fino: "medicacao" cobre prescrição,
// mas exame/classificação/orientação/retorno chegam quase sempre como tipo
// 'consulta'. Inferimos via título (tokens portugueses comuns) seguindo a
// prioridade abaixo. A primeira correspondência vence.

type TipoModal = 'prescricao' | 'classificacao' | 'exame' | 'orientacao' | 'retorno' | 'default'

const PRESCRICAO_TITULO_RE = /^(iniciar|prescrever)\s+(.+)$/i
const CLASSIFICACAO_RE = /(classificar|estadiar|est[áa]gio|grau)/i
const EXAME_RE = /(solicitar|exame|laboratorial|\bECG\b|HbA1c)/i
const ORIENTACAO_RE = /(orientar|educar|\bMEV\b|dieta|exerc[íi]cio)/i
const RETORNO_RE = /(retorno|agendar|seguimento)/i

function detectarTipoModal(acao: AcaoPendente): TipoModal {
  if (acao.tipo === 'medicacao' || PRESCRICAO_TITULO_RE.test(acao.titulo)) return 'prescricao'
  if (CLASSIFICACAO_RE.test(acao.titulo)) return 'classificacao'
  if (acao.tipo === 'exame' || EXAME_RE.test(acao.titulo)) return 'exame'
  if (ORIENTACAO_RE.test(acao.titulo)) return 'orientacao'
  if (RETORNO_RE.test(acao.titulo)) return 'retorno'
  return 'default'
}

function extrairMedicamento(titulo: string): string {
  const m = titulo.match(PRESCRICAO_TITULO_RE)
  return (m?.[2] ?? titulo).trim()
}

// ─── Constantes por tipo ─────────────────────────────────────────────────────

const FREQUENCIAS = ['1x/dia', '2x/dia', '3x/dia', '4x/dia', 'conforme necessidade'] as const
const VIAS = ['oral', 'sublingual', 'tópico', 'inalatório', 'SC', 'IM', 'IV'] as const

const CLASSIFICACOES_POR_PROTOCOLO: Record<string, readonly string[]> = {
  HAS: ['Normal', 'Normal-Alta', 'Estágio 1', 'Estágio 2', 'Estágio 3', 'Sistólica Isolada'],
  DM:  ['Pré-diabetes', 'DM tipo 2 controlado', 'DM tipo 2 não controlado', 'DM tipo 1'],
  DIS: ['Baixo risco', 'Risco intermediário', 'Alto risco', 'Muito alto risco'],
}
const CLASSIFICACAO_GENERICA = ['Leve', 'Moderado', 'Grave', 'Muito grave'] as const
const RISCOS_CV = ['Baixo', 'Moderado', 'Alto', 'Muito alto'] as const
const PROTOCOLOS_COM_RISCO_CV = new Set(['HAS', 'DM', 'DIS'])

const ORIENTACOES_OPCOES = [
  'Dieta hipossódica / DASH',
  'Atividade física ≥ 150 min/semana',
  'Cessação tabágica',
  'Restrição de álcool',
  'Redução ponderal',
  'Adesão medicamentosa reforçada',
] as const

const PRAZOS_EXAME = ['7 dias', '15 dias', '30 dias', 'outro'] as const
const PROFISSIONAIS_RETORNO = ['Médico', 'Enfermagem', 'Técnico'] as const

// ─── Estilos compartilhados ──────────────────────────────────────────────────

const inputCls =
  'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
const textareaCls =
  'flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

// ─── Component ────────────────────────────────────────────────────────────────

export function AcaoExecucaoModal(props: Props) {
  if (!props.aberto) return null
  return <AcaoExecucaoModalInner {...props} />
}

function AcaoExecucaoModalInner({
  modo, acao, pacienteId, profissionalNomeDefault, onFechar, onConfirmado,
}: Props) {
  const pushToast = useToastStore((s) => s.push)
  const ehExecutar = modo === 'executar'
  const tipo: TipoModal = ehExecutar ? detectarTipoModal(acao) : 'default'

  const opcoesClassificacao =
    CLASSIFICACOES_POR_PROTOCOLO[acao.protocolo] ?? CLASSIFICACAO_GENERICA
  const mostrarRiscoCV = PROTOCOLOS_COM_RISCO_CV.has(acao.protocolo)

  // Campos comuns ao modo executar
  const [dataExecucao, setDataExecucao] = useState<string>(hojeISO())
  const [observacao, setObservacao] = useState('')
  const [profissional, setProfissional] = useState(profissionalNomeDefault)

  // Campo do modo justificar
  const [motivo, setMotivo] = useState('')

  // Prescrição
  const [medicamento, setMedicamento] = useState(() =>
    tipo === 'prescricao' ? extrairMedicamento(acao.titulo) : '',
  )
  const [dose, setDose] = useState('')
  const [frequencia, setFrequencia] = useState<string>(FREQUENCIAS[0])
  const [via, setVia] = useState<string>(VIAS[0])
  const [duracao, setDuracao] = useState('')

  // Classificação
  const [classificacao, setClassificacao] = useState<string>(opcoesClassificacao[0])
  const [riscoCV, setRiscoCV] = useState<string>(RISCOS_CV[0])
  const [valorMedida, setValorMedida] = useState('')

  // Exame
  const [exames, setExames] = useState<string>(() =>
    tipo === 'exame' ? acao.titulo.replace(/^solicitar\s+/i, '').trim() : '',
  )
  const [dataSolicitacao, setDataSolicitacao] = useState<string>(hojeISO())
  const [laboratorio, setLaboratorio] = useState('')
  const [prazoExame, setPrazoExame] = useState<string>(PRAZOS_EXAME[1])

  // Orientação
  const [orientacoesSelecionadas, setOrientacoesSelecionadas] = useState<Set<string>>(() => new Set())

  // Retorno
  const [dataRetorno, setDataRetorno] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [profissionalRetorno, setProfissionalRetorno] = useState<string>(PROFISSIONAIS_RETORNO[0])
  const [motivoRetorno, setMotivoRetorno] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function toggleOrientacao(o: string) {
    setOrientacoesSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(o)) next.delete(o)
      else next.add(o)
      return next
    })
  }

  // ─── Validação ─────────────────────────────────────────────────────────────

  function validar(): string | null {
    if (!ehExecutar) {
      if (!motivo.trim()) return 'Descreva o motivo da não execução.'
      return null
    }

    if (!profissional.trim() && tipo !== 'retorno') {
      return 'Informe o profissional responsável.'
    }

    switch (tipo) {
      case 'prescricao':
        if (!medicamento.trim()) return 'Informe o medicamento.'
        if (!dose.trim()) return 'Informe a dose.'
        return null
      case 'classificacao':
        if (!classificacao.trim()) return 'Selecione a classificação.'
        return null
      case 'exame':
        if (!exames.trim()) return 'Informe ao menos um exame.'
        return null
      case 'orientacao':
        if (orientacoesSelecionadas.size === 0) return 'Selecione ao menos uma orientação.'
        return null
      case 'retorno':
        if (!dataRetorno) return 'Informe a data de retorno.'
        if (!motivoRetorno.trim()) return 'Informe o motivo do retorno.'
        return null
      default:
        return null
    }
  }

  // ─── Persistência ──────────────────────────────────────────────────────────

  function montarMetricas(): Record<string, unknown> {
    if (!ehExecutar) {
      return { acao_nao_executada: acao.titulo, motivo: motivo.trim() }
    }

    const base: Record<string, unknown> = {
      acao_executada: acao.titulo,
      data_execucao: dataExecucao,
      profissional_responsavel: profissional.trim() || undefined,
      observacao: observacao.trim() || undefined,
    }

    switch (tipo) {
      case 'prescricao':
        return {
          ...base,
          prescricao: {
            medicamento: medicamento.trim(),
            dose: dose.trim(),
            frequencia,
            via,
            duracao: duracao.trim() || undefined,
            observacoes: observacao.trim() || undefined,
          },
        }
      case 'classificacao':
        return {
          ...base,
          classificacao: {
            estagio: classificacao,
            risco_cv: mostrarRiscoCV ? riscoCV : undefined,
            valor_medida: valorMedida.trim() || undefined,
          },
        }
      case 'exame':
        return {
          ...base,
          exame_solicitado: {
            exames: exames.trim(),
            data_solicitacao: dataSolicitacao,
            laboratorio: laboratorio.trim() || undefined,
            prazo: prazoExame,
          },
        }
      case 'orientacao':
        return {
          ...base,
          orientacoes: Array.from(orientacoesSelecionadas),
        }
      case 'retorno':
        return {
          ...base,
          retorno_agendado: {
            data: dataRetorno,
            profissional_categoria: profissionalRetorno,
            motivo: motivoRetorno.trim(),
          },
        }
      default:
        return base
    }
  }

  async function persistirSideEffects() {
    if (IS_DEMO_MODE) return
    if (!ehExecutar) return
    const supabase = createClient()

    if (tipo === 'exame') {
      // Cada linha do textarea vira uma row pendente; vazio é ignorado.
      const linhas = exames
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (linhas.length === 0) return
      const rows = linhas.map((nome) => ({
        paciente_id: pacienteId,
        nome_exame: nome,
        data_coleta: dataSolicitacao,
        status: 'pendente' as const,
      }))
      const { error } = await supabase.from('exames_resultados').insert(rows)
      if (error) throw error
    }

    if (tipo === 'retorno') {
      // agendamentos.data_hora exige timestamp — combinamos a data com 09:00
      // (horário comercial padrão) para um placeholder editável depois.
      const dataHora = new Date(`${dataRetorno}T09:00:00`).toISOString()
      const { error } = await supabase.from('agendamentos').insert({
        paciente_id: pacienteId,
        profissional_id: null,
        data_hora: dataHora,
        tipo: 'retorno',
        protocolos_previstos: [acao.protocolo],
        status: 'agendado',
      })
      if (error) throw error
    }
  }

  async function confirmar() {
    setErro(null)
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setSalvando(true)
    try {
      const metricas = montarMetricas()

      if (!IS_DEMO_MODE) {
        const supabase = createClient()
        const { error } = await supabase.from('evolucoes_clinicas').insert({
          paciente_id: pacienteId,
          consulta_id: null,
          protocolo_codigo: acao.protocolo,
          passo_protocolo: acao.passo,
          metricas: { ...metricas, origem: 'acao_jornada', tipo_modal: tipo },
        })
        if (error) throw error
        await persistirSideEffects()
      }

      pushToast({
        tipo: 'sucesso',
        titulo: tituloToastSucesso(tipo, ehExecutar),
        descricao: acao.titulo,
      })
      onConfirmado()
      onFechar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao registrar ação'
      setErro(msg)
    } finally {
      setSalvando(false)
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  const cabecalho = cabecalhoModal(tipo, ehExecutar)

  return (
    <Dialog open onOpenChange={(open) => !open && !salvando && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{cabecalho.icone}</span>
            {cabecalho.titulo}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {acao.titulo}
            {acao.bloqueante && (
              <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                BLOQUEANTE
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!ehExecutar && (
            <div className="space-y-1.5">
              <Label htmlFor="acao-motivo">Motivo da não execução</Label>
              <textarea
                id="acao-motivo"
                rows={4}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: paciente recusou medicação, contraindicação clínica, pendência logística…"
                className={textareaCls}
              />
              <p className="text-[11px] text-slate-400">
                A justificativa fica registrada no histórico e libera o motor para reavaliar a etapa.
              </p>
            </div>
          )}

          {ehExecutar && tipo === 'prescricao' && (
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Prescrição</p>
              <div className="space-y-1.5">
                <Label htmlFor="rx-medicamento">Medicamento</Label>
                <input id="rx-medicamento" type="text" value={medicamento}
                  onChange={(e) => setMedicamento(e.target.value)}
                  placeholder="Ex.: Metformina" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rx-dose">Dose</Label>
                  <input id="rx-dose" type="text" value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="Ex.: 500mg" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rx-frequencia">Frequência</Label>
                  <select id="rx-frequencia" value={frequencia}
                    onChange={(e) => setFrequencia(e.target.value)} className={inputCls}>
                    {FREQUENCIAS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rx-via">Via</Label>
                  <select id="rx-via" value={via}
                    onChange={(e) => setVia(e.target.value)} className={inputCls}>
                    {VIAS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rx-duracao">Duração</Label>
                  <input id="rx-duracao" type="text" value={duracao}
                    onChange={(e) => setDuracao(e.target.value)}
                    placeholder='Ex.: "30 dias", "uso contínuo"' className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {ehExecutar && tipo === 'classificacao' && (
            <div className="rounded-md border border-violet-100 bg-violet-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                Classificação / Estadiamento ({acao.protocolo})
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="cl-estagio">Classificação / Estágio</Label>
                <select id="cl-estagio" value={classificacao}
                  onChange={(e) => setClassificacao(e.target.value)} className={inputCls}>
                  {opcoesClassificacao.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {mostrarRiscoCV && (
                <div className="space-y-1.5">
                  <Label htmlFor="cl-risco">Risco cardiovascular</Label>
                  <select id="cl-risco" value={riscoCV}
                    onChange={(e) => setRiscoCV(e.target.value)} className={inputCls}>
                    {RISCOS_CV.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="cl-valor">Valor da medida</Label>
                <input id="cl-valor" type="text" value={valorMedida}
                  onChange={(e) => setValorMedida(e.target.value)}
                  placeholder="Ex.: PA 160/100 mmHg, HbA1c 8.5%" className={inputCls} />
              </div>
            </div>
          )}

          {ehExecutar && tipo === 'exame' && (
            <div className="rounded-md border border-cyan-100 bg-cyan-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Exame solicitado</p>
              <div className="space-y-1.5">
                <Label htmlFor="ex-nome">Exame(s) solicitado(s)</Label>
                <textarea id="ex-nome" rows={3} value={exames}
                  onChange={(e) => setExames(e.target.value)}
                  placeholder="Um exame por linha — ex.: HbA1c, Perfil lipídico"
                  className={textareaCls} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ex-data">Data de solicitação</Label>
                  <input id="ex-data" type="date" value={dataSolicitacao}
                    onChange={(e) => setDataSolicitacao(e.target.value)}
                    className={inputCls} max={hojeISO()} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-prazo">Prazo para resultado</Label>
                  <select id="ex-prazo" value={prazoExame}
                    onChange={(e) => setPrazoExame(e.target.value)} className={inputCls}>
                    {PRAZOS_EXAME.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-lab">Laboratório / Local</Label>
                <input id="ex-lab" type="text" value={laboratorio}
                  onChange={(e) => setLaboratorio(e.target.value)}
                  placeholder="Ex.: Lab. Empresa, Unidade Central" className={inputCls} />
              </div>
            </div>
          )}

          {ehExecutar && tipo === 'orientacao' && (
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Orientações dadas ao paciente
              </p>
              <div className="space-y-1.5">
                {ORIENTACOES_OPCOES.map((o) => (
                  <label key={o} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="mt-0.5"
                      checked={orientacoesSelecionadas.has(o)}
                      onChange={() => toggleOrientacao(o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {ehExecutar && tipo === 'retorno' && (
            <div className="rounded-md border border-indigo-100 bg-indigo-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                Agendamento de retorno
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rt-data">Data do próximo retorno</Label>
                  <input id="rt-data" type="date" value={dataRetorno}
                    onChange={(e) => setDataRetorno(e.target.value)}
                    className={inputCls} min={hojeISO()} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rt-prof">Profissional responsável</Label>
                  <select id="rt-prof" value={profissionalRetorno}
                    onChange={(e) => setProfissionalRetorno(e.target.value)} className={inputCls}>
                    {PROFISSIONAIS_RETORNO.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rt-motivo">Motivo do retorno</Label>
                <input id="rt-motivo" type="text" value={motivoRetorno}
                  onChange={(e) => setMotivoRetorno(e.target.value)}
                  placeholder="Ex.: reavaliar PA pós-ajuste, revisar exames" className={inputCls} />
              </div>
            </div>
          )}

          {/* Campos comuns ao modo executar — exceto retorno (que já capta data/profissional). */}
          {ehExecutar && tipo !== 'retorno' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="acao-data">Data de execução</Label>
                <input id="acao-data" type="date" value={dataExecucao}
                  onChange={(e) => setDataExecucao(e.target.value)}
                  className={inputCls} max={hojeISO()} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acao-prof">Profissional responsável</Label>
                <input id="acao-prof" type="text" value={profissional}
                  onChange={(e) => setProfissional(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acao-obs">Observações</Label>
                <textarea id="acao-obs" rows={3} value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder={placeholderObservacao(tipo)}
                  className={textareaCls} />
              </div>
            </>
          )}

          {erro && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {erro}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={salvando}
            className={
              ehExecutar
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }
          >
            {salvando ? 'Salvando…' : cabecalho.cta}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Texto contextual ────────────────────────────────────────────────────────

function cabecalhoModal(tipo: TipoModal, ehExecutar: boolean): {
  icone: string; titulo: string; cta: string
} {
  if (!ehExecutar) {
    return { icone: '⚠️', titulo: 'Justificar não execução', cta: 'Registrar justificativa' }
  }
  switch (tipo) {
    case 'prescricao':
      return { icone: '💊', titulo: 'Registrar prescrição', cta: 'Confirmar prescrição' }
    case 'classificacao':
      return { icone: '🏷️', titulo: 'Registrar classificação', cta: 'Confirmar classificação' }
    case 'exame':
      return { icone: '🧪', titulo: 'Solicitar exame', cta: 'Confirmar solicitação' }
    case 'orientacao':
      return { icone: '📚', titulo: 'Registrar orientações', cta: 'Confirmar orientações' }
    case 'retorno':
      return { icone: '📅', titulo: 'Agendar retorno', cta: 'Confirmar agendamento' }
    default:
      return { icone: '✅', titulo: 'Registrar execução', cta: 'Confirmar execução' }
  }
}

function tituloToastSucesso(tipo: TipoModal, ehExecutar: boolean): string {
  if (!ehExecutar) return 'Não execução justificada'
  switch (tipo) {
    case 'prescricao':   return 'Prescrição registrada'
    case 'classificacao':return 'Classificação registrada'
    case 'exame':        return 'Exame solicitado'
    case 'orientacao':   return 'Orientações registradas'
    case 'retorno':      return 'Retorno agendado'
    default:             return 'Ação registrada com sucesso'
  }
}

function placeholderObservacao(tipo: TipoModal): string {
  switch (tipo) {
    case 'prescricao':
      return 'Ex.: dose inicial, aumentar gradualmente conforme tolerância.'
    case 'classificacao':
      return 'Ex.: paciente com lesão de órgão alvo, considerar nefroproteção.'
    case 'exame':
      return 'Ex.: jejum de 8h, evitar exercício físico nas 24h prévias.'
    case 'orientacao':
      return 'Ex.: paciente compreendeu, aceita iniciar mudanças graduais.'
    default:
      return 'Ex.: paciente tolerou bem, contexto adicional.'
  }
}
