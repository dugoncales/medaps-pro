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

function hojeISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Ação é prescrição quando o motor classificou como medicação OU quando o
// título começa com "Iniciar"/"Prescrever" (ex.: "Iniciar Metformina").
const PRESCRICAO_TITULO_RE = /^(iniciar|prescrever)\s+(.+)$/i
function detectarPrescricao(acao: AcaoPendente): { ehPrescricao: boolean; medicamentoSugerido: string } {
  const m = acao.titulo.match(PRESCRICAO_TITULO_RE)
  if (acao.tipo === 'medicacao') {
    return { ehPrescricao: true, medicamentoSugerido: (m?.[2] ?? acao.titulo).trim() }
  }
  if (m) {
    return { ehPrescricao: true, medicamentoSugerido: m[2].trim() }
  }
  return { ehPrescricao: false, medicamentoSugerido: '' }
}

const FREQUENCIAS = ['1x/dia', '2x/dia', '3x/dia', '4x/dia', 'conforme necessidade'] as const
const VIAS = ['oral', 'sublingual', 'tópico', 'inalatório', 'SC', 'IM', 'IV'] as const

const inputCls =
  'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
const textareaCls =
  'flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

export function AcaoExecucaoModal(props: Props) {
  if (!props.aberto) return null
  return <AcaoExecucaoModalInner {...props} />
}

function AcaoExecucaoModalInner({
  modo, acao, pacienteId, profissionalNomeDefault, onFechar, onConfirmado,
}: Props) {
  const pushToast = useToastStore((s) => s.push)
  const { ehPrescricao, medicamentoSugerido } = detectarPrescricao(acao)
  const ehExecutar = modo === 'executar'
  const mostrarPrescricao = ehExecutar && ehPrescricao

  const [dataExecucao, setDataExecucao] = useState<string>(hojeISO())
  const [observacao, setObservacao] = useState('')
  const [profissional, setProfissional] = useState(profissionalNomeDefault)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Campos de prescrição (só usados quando mostrarPrescricao = true)
  const [medicamento, setMedicamento] = useState(medicamentoSugerido)
  const [dose, setDose] = useState('')
  const [frequencia, setFrequencia] = useState<string>(FREQUENCIAS[0])
  const [via, setVia] = useState<string>(VIAS[0])
  const [duracao, setDuracao] = useState('')

  async function confirmar() {
    setErro(null)

    if (ehExecutar) {
      if (!profissional.trim()) {
        setErro('Informe o profissional responsável.')
        return
      }
      if (mostrarPrescricao) {
        if (!medicamento.trim()) {
          setErro('Informe o medicamento.')
          return
        }
        if (!dose.trim()) {
          setErro('Informe a dose.')
          return
        }
      }
    } else {
      if (!motivo.trim()) {
        setErro('Descreva o motivo da não execução.')
        return
      }
    }

    setSalvando(true)
    try {
      const metricas: Record<string, unknown> = ehExecutar
        ? {
            acao_executada: acao.titulo,
            data_execucao: dataExecucao,
            profissional_responsavel: profissional.trim(),
            observacao: observacao.trim() || undefined,
            ...(mostrarPrescricao && {
              prescricao: {
                medicamento: medicamento.trim(),
                dose: dose.trim(),
                frequencia,
                via,
                duracao: duracao.trim() || undefined,
                observacoes: observacao.trim() || undefined,
              },
            }),
          }
        : {
            acao_nao_executada: acao.titulo,
            motivo: motivo.trim(),
          }

      const linha = {
        paciente_id: pacienteId,
        consulta_id: null,
        protocolo_codigo: acao.protocolo,
        passo_protocolo: acao.passo,
        metricas: { ...metricas, origem: 'acao_jornada' },
      }

      if (!IS_DEMO_MODE) {
        const supabase = createClient()
        const { error } = await supabase.from('evolucoes_clinicas').insert(linha)
        if (error) throw error
      }

      pushToast({
        tipo: 'sucesso',
        titulo: ehExecutar ? 'Ação registrada com sucesso' : 'Não execução justificada',
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

  return (
    <Dialog open onOpenChange={(open) => !open && !salvando && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{mostrarPrescricao ? '💊' : ehExecutar ? '✅' : '⚠️'}</span>
            {mostrarPrescricao
              ? 'Registrar prescrição'
              : ehExecutar
              ? 'Registrar execução'
              : 'Justificar não execução'}
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
          {ehExecutar ? (
            <>
              {mostrarPrescricao && (
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Prescrição
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="rx-medicamento">Medicamento</Label>
                    <input
                      id="rx-medicamento"
                      type="text"
                      value={medicamento}
                      onChange={(e) => setMedicamento(e.target.value)}
                      placeholder="Ex.: Metformina"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="rx-dose">Dose</Label>
                      <input
                        id="rx-dose"
                        type="text"
                        value={dose}
                        onChange={(e) => setDose(e.target.value)}
                        placeholder="Ex.: 500mg"
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rx-frequencia">Frequência</Label>
                      <select
                        id="rx-frequencia"
                        value={frequencia}
                        onChange={(e) => setFrequencia(e.target.value)}
                        className={inputCls}
                      >
                        {FREQUENCIAS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="rx-via">Via</Label>
                      <select
                        id="rx-via"
                        value={via}
                        onChange={(e) => setVia(e.target.value)}
                        className={inputCls}
                      >
                        {VIAS.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rx-duracao">Duração</Label>
                      <input
                        id="rx-duracao"
                        type="text"
                        value={duracao}
                        onChange={(e) => setDuracao(e.target.value)}
                        placeholder='Ex.: "30 dias", "uso contínuo"'
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="acao-data">Data de execução</Label>
                <input
                  id="acao-data"
                  type="date"
                  value={dataExecucao}
                  onChange={(e) => setDataExecucao(e.target.value)}
                  className={inputCls}
                  max={hojeISO()}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acao-prof">Profissional responsável</Label>
                <input
                  id="acao-prof"
                  type="text"
                  value={profissional}
                  onChange={(e) => setProfissional(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acao-obs">
                  {mostrarPrescricao ? 'Observações' : 'Observação (opcional)'}
                </Label>
                <textarea
                  id="acao-obs"
                  rows={3}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder={
                    mostrarPrescricao
                      ? 'Ex.: dose inicial, aumentar gradualmente conforme tolerância.'
                      : 'Ex.: paciente tolerou bem, dose inicial 500mg/dia.'
                  }
                  className={textareaCls}
                />
              </div>
            </>
          ) : (
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
            {salvando
              ? 'Salvando…'
              : mostrarPrescricao
              ? 'Confirmar prescrição'
              : ehExecutar
              ? 'Confirmar execução'
              : 'Registrar justificativa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
