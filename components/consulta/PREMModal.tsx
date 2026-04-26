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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface RespostaPREM {
  nps: number
  acolhimento: number
  clareza: number
  resolutividade: number
  resposta_tempo: number
  comentario?: string
  data: string
}

const PERGUNTAS_LIKERT = [
  { id: 'acolhimento',    texto: 'Quão acolhido(a) você se sentiu pela equipe nesta consulta?' },
  { id: 'clareza',        texto: 'Quão claras foram as orientações sobre seu tratamento?' },
  { id: 'resolutividade', texto: 'Quanto suas dúvidas e queixas foram resolvidas hoje?' },
  { id: 'resposta_tempo', texto: 'Como avalia o tempo dedicado pelo profissional à sua consulta?' },
] as const

const LIKERT_LABELS = ['Muito insatisfeito', 'Insatisfeito', 'Neutro', 'Satisfeito', 'Muito satisfeito']

interface PREMModalProps {
  aberto: boolean
  onSubmit: (resposta: RespostaPREM) => void
  onPular: () => void
  pacienteNome: string
}

export function PREMModal({ aberto, onSubmit, onPular, pacienteNome }: PREMModalProps) {
  const [nps, setNps] = useState<number | null>(null)
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  const completo = nps !== null && PERGUNTAS_LIKERT.every((p) => respostas[p.id] !== undefined)

  function reset() {
    setNps(null)
    setRespostas({})
    setComentario('')
    setEnviando(false)
  }

  function handlePular() {
    reset()
    onPular()
  }

  async function handleSubmit() {
    if (!completo || nps === null) return
    setEnviando(true)
    onSubmit({
      nps,
      acolhimento:    respostas['acolhimento'],
      clareza:        respostas['clareza'],
      resolutividade: respostas['resolutividade'],
      resposta_tempo: respostas['resposta_tempo'],
      comentario:     comentario.trim() || undefined,
      data: new Date().toISOString(),
    })
    reset()
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && handlePular()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">📋 Pesquisa de Experiência (PREM)</DialogTitle>
          <DialogDescription className="text-xs">
            {pacienteNome.split(' ')[0]}, sua opinião nos ajuda a melhorar o cuidado.
            Leva menos de 1 minuto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* NPS */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">
              De 0 a 10, o quanto você indicaria o nosso ambulatório a um colega?
            </p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNps(n)}
                  className={cn(
                    'h-9 w-9 rounded-md border text-sm font-bold transition-colors',
                    nps === n
                      ? n <= 6
                        ? 'border-red-500 bg-red-600 text-white'
                        : n <= 8
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-emerald-500 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400">
              <span>Não indicaria</span>
              <span>Indicaria com certeza</span>
            </div>
            {nps !== null && (
              <p className="mt-2 text-xs font-semibold">
                {nps <= 6 && <span className="text-red-600">Detrator — sentimos muito pela experiência.</span>}
                {nps >= 7 && nps <= 8 && <span className="text-amber-600">Neutro — estamos sempre buscando melhorar.</span>}
                {nps >= 9 && <span className="text-emerald-600">Promotor — obrigado pela confiança! 🎉</span>}
              </p>
            )}
          </div>

          {/* Likert 1–5 */}
          <div className="space-y-3">
            {PERGUNTAS_LIKERT.map((p, i) => (
              <div key={p.id} className="rounded-lg border border-slate-100 p-3">
                <p className="text-sm text-slate-700 mb-2">
                  <span className="text-slate-400 mr-1">{i + 1}.</span>
                  {p.texto}
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((v) => {
                    const ativo = respostas[p.id] === v
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRespostas((r) => ({ ...r, [p.id]: v }))}
                        className={cn(
                          'rounded-md border px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors',
                          ativo
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50',
                        )}
                      >
                        <span className="block text-sm font-bold">{v}</span>
                        <span className="block text-[9px] opacity-90">{LIKERT_LABELS[v - 1]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Comentário */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Comentário (opcional)
            </label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Algum elogio, crítica ou sugestão?"
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={handlePular} disabled={enviando}>
            Pular
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!completo || enviando}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {enviando ? 'Enviando…' : 'Enviar resposta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
