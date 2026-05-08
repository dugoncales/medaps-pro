'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { useToastStore } from '@/lib/store/toast-store'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import type { Agendamento } from '@/types'
import { cn } from '@/lib/utils'

type TipoConsulta = 'consulta' | 'retorno' | 'triagem' | 'exame'

interface Props {
  aberto: boolean
  onFechar: () => void
  pacienteId: string
  pacienteNome: string
  /** Códigos das linhas ativas (para sugerir como protocolos previstos) */
  protocolosAtivos: string[]
  profissionalId?: string
  /** Pré-seleção opcional, ex.: vindo de um botão de jornada */
  protocoloSugerido?: string
  onAgendado: (agendamento: Agendamento) => void
}

const TIPOS: { v: TipoConsulta; label: string }[] = [
  { v: 'consulta', label: 'Consulta' },
  { v: 'retorno',  label: 'Retorno' },
  { v: 'triagem',  label: 'Triagem' },
  { v: 'exame',    label: 'Exame' },
]

function proximaSemanaUtilISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(9, 0, 0, 0)
  return d.toISOString().slice(0, 16) // formato datetime-local
}

export function AgendarConsultaModal(props: Props) {
  if (!props.aberto) return null
  return <AgendarConsultaModalInner {...props} />
}

function AgendarConsultaModalInner({
  onFechar, pacienteId, pacienteNome, protocolosAtivos, profissionalId,
  protocoloSugerido, onAgendado,
}: Props) {
  const pushToast = useToastStore(s => s.push)

  const [tipo, setTipo] = useState<TipoConsulta>('retorno')
  const [dataHora, setDataHora] = useState<string>(proximaSemanaUtilISO())
  const [protocolosSelecionados, setProtocolosSelecionados] = useState<string[]>(
    () => protocoloSugerido ? [protocoloSugerido] : protocolosAtivos.slice(0, 2),
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const opcoesProtocolo = useMemo(() => {
    const set = new Set([...protocolosAtivos, ...(protocoloSugerido ? [protocoloSugerido] : [])])
    return Array.from(set)
  }, [protocolosAtivos, protocoloSugerido])

  function toggleProtocolo(cod: string) {
    setProtocolosSelecionados(curr =>
      curr.includes(cod) ? curr.filter(c => c !== cod) : [...curr, cod],
    )
  }

  async function salvar() {
    if (!dataHora) {
      setErro('Informe data e hora.')
      return
    }
    const dt = new Date(dataHora)
    if (!Number.isFinite(dt.getTime())) {
      setErro('Data inválida.')
      return
    }
    setSalvando(true)
    setErro(null)

    try {
      let agendamento: Agendamento

      if (!IS_DEMO_MODE) {
        const supabase = createClient()
        // Pegamos só o id após o INSERT — quanto menos colunas o select
        // retorna, menor a chance da RLS pós-insert falhar com 400. O
        // resto do agendamento já está em memória (acabamos de gravá-lo)
        // e o realtime channel da agenda repuxa a row completa.
        const dataHoraIso = dt.toISOString()
        const agora = new Date().toISOString()
        const { data, error } = await supabase
          .from('agendamentos')
          .insert({
            paciente_id: pacienteId,
            profissional_id: profissionalId ?? null,
            data_hora: dataHoraIso,
            tipo,
            protocolos_previstos: protocolosSelecionados,
            status: 'agendado',
          })
          .select('id')
          .single()
        if (error) throw error
        agendamento = {
          id: (data as { id: string }).id,
          paciente_id: pacienteId,
          profissional_id: profissionalId,
          data_hora: dataHoraIso,
          tipo,
          protocolos_previstos: protocolosSelecionados,
          status: 'agendado',
          created_at: agora,
          paciente: { nome: pacienteNome, matricula: '', setor: '' },
        }
      } else {
        agendamento = {
          id: `ag-${Date.now()}`,
          paciente_id: pacienteId,
          profissional_id: profissionalId,
          data_hora: dt.toISOString(),
          tipo,
          protocolos_previstos: protocolosSelecionados,
          status: 'agendado',
          created_at: new Date().toISOString(),
          paciente: { nome: pacienteNome, matricula: '', setor: '' },
        }
      }

      onAgendado(agendamento)
      pushToast({
        tipo: 'sucesso',
        titulo: 'Consulta agendada com sucesso',
        descricao: `${pacienteNome.split(' ')[0]} — ${dt.toLocaleString('pt-BR', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}`,
      })
      onFechar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao agendar'
      setErro(msg)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !salvando && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>📅 Agendar consulta</DialogTitle>
          <DialogDescription className="text-xs">
            Para {pacienteNome}. O agendamento aparecerá na agenda do dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div>
            <Label>Tipo</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {TIPOS.map(t => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setTipo(t.v)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs font-semibold transition-colors',
                    tipo === t.v
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data + hora */}
          <div>
            <Label htmlFor="data_hora">Data e hora</Label>
            <Input
              id="data_hora"
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Protocolos */}
          <div>
            <Label>Protocolos previstos</Label>
            {opcoesProtocolo.length === 0 ? (
              <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Este paciente não possui linhas de cuidado ativas.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {opcoesProtocolo.map(cod => {
                  const proto = PROTOCOLO_MAP.get(cod)
                  const ativo = protocolosSelecionados.includes(cod)
                  return (
                    <button
                      key={cod}
                      type="button"
                      onClick={() => toggleProtocolo(cod)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                        ativo
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      <span
                        className="inline-flex h-4 items-center rounded px-1 text-[9px] font-bold text-white"
                        style={{ backgroundColor: proto?.cor ?? '#6b7280' }}
                      >
                        {cod}
                      </span>
                      {proto?.nome ?? cod}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {erro && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {erro}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button
            onClick={salvar}
            disabled={salvando}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {salvando ? 'Agendando…' : 'Confirmar agendamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
