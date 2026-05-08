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

export function AcaoExecucaoModal(props: Props) {
  if (!props.aberto) return null
  return <AcaoExecucaoModalInner {...props} />
}

function AcaoExecucaoModalInner({
  modo, acao, pacienteId, profissionalNomeDefault, onFechar, onConfirmado,
}: Props) {
  const pushToast = useToastStore((s) => s.push)
  const [dataExecucao, setDataExecucao] = useState<string>(hojeISO())
  const [observacao, setObservacao] = useState('')
  const [profissional, setProfissional] = useState(profissionalNomeDefault)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const ehExecutar = modo === 'executar'

  async function confirmar() {
    setErro(null)

    if (ehExecutar) {
      if (!profissional.trim()) {
        setErro('Informe o profissional responsável.')
        return
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{ehExecutar ? '✅' : '⚠️'}</span>
            {ehExecutar ? 'Registrar execução' : 'Justificar não execução'}
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
              <div className="space-y-1.5">
                <Label htmlFor="acao-data">Data de execução</Label>
                <input
                  id="acao-data"
                  type="date"
                  value={dataExecucao}
                  onChange={(e) => setDataExecucao(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acao-obs">Observação (opcional)</Label>
                <textarea
                  id="acao-obs"
                  rows={3}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex.: paciente tolerou bem, dose inicial 500mg/dia."
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
            {salvando ? 'Salvando…' : ehExecutar ? 'Confirmar execução' : 'Registrar justificativa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
