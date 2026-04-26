'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EscalaICHOM } from '@/components/consulta/EscalaICHOM'
import {
  ESCALAS, calcularResultado, escalaCompleta, getEscalasParaProtocolos,
  type EscalaCodigo, type ResultadoEscala,
} from '@/lib/escalas/ichom'

interface ModalAplicarEscalaProps {
  aberto: boolean
  onFechar: () => void
  onSubmit: (codigo: EscalaCodigo, resultado: ResultadoEscala) => void
  protocolosAtivos: string[]
}

export function ModalAplicarEscala({
  aberto, onFechar, onSubmit, protocolosAtivos,
}: ModalAplicarEscalaProps) {
  const sugestoes = useMemo(
    () => getEscalasParaProtocolos(protocolosAtivos),
    [protocolosAtivos],
  )
  const codigosSugeridos = useMemo(
    () => sugestoes.map((s) => s.codigo),
    [sugestoes],
  )
  const codigosOutros = useMemo(
    () => (Object.keys(ESCALAS) as EscalaCodigo[]).filter((c) => !codigosSugeridos.includes(c)),
    [codigosSugeridos],
  )

  const [codigo, setCodigo] = useState<EscalaCodigo | null>(sugestoes[0]?.codigo ?? null)
  const [respostas, setRespostas] = useState<Record<string, number>>({})

  function fechar() {
    setCodigo(sugestoes[0]?.codigo ?? null)
    setRespostas({})
    onFechar()
  }

  function salvar() {
    if (!codigo) return
    if (!escalaCompleta(codigo, respostas)) return
    const resultado = calcularResultado(codigo, respostas)
    onSubmit(codigo, resultado)
    setRespostas({})
  }

  const completo = codigo ? escalaCompleta(codigo, respostas) : false

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📊 Aplicar Escala ICHOM</DialogTitle>
          <DialogDescription className="text-xs">
            Escolha a escala e responda às perguntas. O resultado será gravado no histórico do paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Escala</label>
            <select
              value={codigo ?? ''}
              onChange={(e) => {
                setCodigo(e.target.value as EscalaCodigo)
                setRespostas({})
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {sugestoes.length > 0 && (
                <optgroup label="Sugeridas pelos protocolos">
                  {sugestoes.map((s) => {
                    const def = ESCALAS[s.codigo]
                    return (
                      <option key={s.codigo} value={s.codigo}>
                        {def.nome} {s.obrigatoria ? '· Obrigatória' : ''}
                      </option>
                    )
                  })}
                </optgroup>
              )}
              <optgroup label="Outras escalas">
                {codigosOutros.map((c) => (
                  <option key={c} value={c}>{ESCALAS[c].nome}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {codigo && (
            <EscalaICHOM
              codigo={codigo}
              respostas={respostas}
              onChange={setRespostas}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button
            onClick={salvar}
            disabled={!completo}
            className="bg-blue-600 hover:bg-blue-500"
          >
            Salvar resultado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
