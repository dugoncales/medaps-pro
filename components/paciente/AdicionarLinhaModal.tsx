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
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { useRuntimeStore, gerarId } from '@/lib/store/runtime-store'
import { useToastStore } from '@/lib/store/toast-store'
import { PROTOCOLOS, PROTOCOLO_MAP } from '@/lib/protocolos'
import type { LinhaCuidado, StatusControle } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  aberto: boolean
  onFechar: () => void
  pacienteId: string
  pacienteNome: string
  profissionalId?: string
  /** Códigos já em linhas ATIVAS para o paciente (não exibimos esses) */
  protocolosJaAtivos: string[]
  onAdicionado: (linha: LinhaCuidado) => void
}

const NIVEIS: { v: StatusControle; label: string; cor: string }[] = [
  { v: 'controlado',     label: 'Controlado',     cor: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { v: 'parcial',        label: 'Parcial',        cor: 'border-amber-500 bg-amber-50 text-amber-700' },
  { v: 'descontrolado',  label: 'Descontrolado',  cor: 'border-red-500 bg-red-50 text-red-700' },
]

export function AdicionarLinhaModal(props: Props) {
  if (!props.aberto) return null
  return <AdicionarLinhaModalInner {...props} />
}

function AdicionarLinhaModalInner({
  onFechar, pacienteId, pacienteNome, profissionalId, protocolosJaAtivos, onAdicionado,
}: Props) {
  const adicionarRuntime = useRuntimeStore(s => s.adicionarLinha)
  const pushToast = useToastStore(s => s.push)

  const ativosSet = useMemo(() => new Set(protocolosJaAtivos), [protocolosJaAtivos])
  const disponiveis = useMemo(
    () => PROTOCOLOS.filter(p => !ativosSet.has(p.codigo)),
    [ativosSet],
  )

  const [protocoloCodigo, setProtocoloCodigo] = useState<string>('')
  const [nivel, setNivel] = useState<StatusControle>('parcial')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (!protocoloCodigo) {
      setErro('Selecione um protocolo.')
      return
    }
    setSalvando(true)
    setErro(null)

    const agora = new Date().toISOString()

    try {
      let linha: LinhaCuidado

      if (!IS_DEMO_MODE) {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('linhas_cuidado')
          .insert({
            paciente_id: pacienteId,
            protocolo_codigo: protocoloCodigo,
            status: 'ativo',
            nivel_gravidade: nivel,
            profissional_id: profissionalId ?? null,
          })
          .select('*')
          .single()
        if (error) throw error
        linha = data as LinhaCuidado
      } else {
        linha = {
          id: gerarId('lc'),
          paciente_id: pacienteId,
          protocolo_codigo: protocoloCodigo,
          status: 'ativo',
          nivel_gravidade: nivel,
          profissional_id: profissionalId,
          created_at: agora,
          updated_at: agora,
        }
        adicionarRuntime(linha)
      }

      onAdicionado(linha)
      const proto = PROTOCOLO_MAP.get(protocoloCodigo)
      pushToast({
        tipo: 'sucesso',
        titulo: 'Linha de cuidado adicionada',
        descricao: `${proto?.nome ?? protocoloCodigo} foi vinculado a ${pacienteNome.split(' ')[0]}.`,
      })
      onFechar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao adicionar linha'
      setErro(msg)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !salvando && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>+ Adicionar Linha de Cuidado</DialogTitle>
          <DialogDescription className="text-xs">
            Escolha o protocolo a vincular ao paciente {pacienteNome.split(' ')[0]}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Protocolo</Label>
            {disponiveis.length === 0 ? (
              <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Este paciente já possui todos os protocolos disponíveis vinculados.
              </p>
            ) : (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-slate-200">
                {disponiveis.map(p => {
                  const ativo = protocoloCodigo === p.codigo
                  return (
                    <button
                      key={p.codigo}
                      type="button"
                      onClick={() => setProtocoloCodigo(p.codigo)}
                      className={cn(
                        'flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm transition-colors last:border-b-0',
                        ativo ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-slate-50',
                      )}
                    >
                      <span
                        className="inline-flex h-7 w-12 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: p.cor }}
                      >
                        {p.codigo}
                      </span>
                      <span className="text-base">{p.icone}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700">{p.nome}</p>
                      </div>
                      {ativo && <span className="text-xs font-bold text-blue-600">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <Label>Nível de gravidade inicial</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {NIVEIS.map(n => {
                const ativo = nivel === n.v
                return (
                  <button
                    key={n.v}
                    type="button"
                    onClick={() => setNivel(n.v)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-xs font-semibold transition-colors',
                      ativo ? n.cor : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                    )}
                  >
                    {n.label}
                  </button>
                )
              })}
            </div>
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
            disabled={salvando || !protocoloCodigo || disponiveis.length === 0}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {salvando ? 'Adicionando…' : 'Adicionar linha'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
