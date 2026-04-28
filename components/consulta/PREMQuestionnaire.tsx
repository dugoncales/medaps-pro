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
import {
  PREMS_DEFINICOES,
  perguntasPorProtocolo,
  calcularResultadoPREM,
  premCompleto,
  LIKERT_LABELS,
  type PremCodigo,
  type PremPergunta,
  type RespostasPREM,
  type ResultadoPREM,
} from '@/lib/escalas/prems'
import { cn } from '@/lib/utils'

interface PREMQuestionnaireProps {
  aberto: boolean
  onFechar: () => void
  onSubmit: (resultado: ResultadoPREM) => void
  codigo: PremCodigo
  pacienteNome: string
  protocolosAtivos?: string[]
  /** Texto extra para experiências preenchidas remotamente */
  contexto?: string
}

export function PREMQuestionnaire({
  aberto, onFechar, onSubmit, codigo, pacienteNome, protocolosAtivos, contexto,
}: PREMQuestionnaireProps) {
  const def = PREMS_DEFINICOES[codigo]
  const perguntas = useMemo<PremPergunta[]>(() => {
    if (codigo === 'PROTOCOLO' && protocolosAtivos) return perguntasPorProtocolo(protocolosAtivos)
    return def.perguntas
  }, [codigo, def.perguntas, protocolosAtivos])

  const [respostas, setRespostas] = useState<RespostasPREM>({})
  const [enviando, setEnviando] = useState(false)
  const [agradecimento, setAgradecimento] = useState(false)

  const completa = premCompleto(codigo, respostas, protocolosAtivos)
  const respondidas = perguntas.filter(p => respostas[p.id] !== undefined).length

  function reset() {
    setRespostas({})
    setEnviando(false)
    setAgradecimento(false)
  }

  function fechar() {
    reset()
    onFechar()
  }

  async function handleSubmit() {
    if (!completa) return
    setEnviando(true)
    const resultado = calcularResultadoPREM(codigo, respostas, protocolosAtivos)
    onSubmit(resultado)
    setAgradecimento(true)
    setEnviando(false)
  }

  if (perguntas.length === 0) {
    return (
      <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sem perguntas aplicáveis</DialogTitle>
            <DialogDescription className="text-xs">
              Não há perguntas de PREM por protocolo configuradas para as linhas de cuidado deste paciente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={fechar}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">📋 {def.nome}</DialogTitle>
          <DialogDescription className="text-xs">
            {pacienteNome.split(' ')[0]}, {def.descricao} {contexto ?? ''}
          </DialogDescription>
        </DialogHeader>

        {agradecimento ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="text-4xl">🙏</span>
            <p className="text-sm font-semibold text-emerald-700">Obrigado pela sua resposta!</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Sua opinião ajuda nossa equipe a melhorar continuamente o cuidado oferecido.
            </p>
            <Button onClick={fechar} className="mt-2">Fechar</Button>
          </div>
        ) : (
          <>
            {/* Progresso */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(respondidas / perguntas.length) * 100}%` }}
                />
              </div>
              <span className="num-tabular shrink-0">{respondidas} de {perguntas.length}</span>
            </div>

            <div className="space-y-3 py-2">
              {perguntas.map((p, idx) => (
                <PerguntaPREM
                  key={p.id}
                  pergunta={p}
                  numero={idx + 1}
                  valor={respostas[p.id]}
                  onSelect={(v) => setRespostas(r => ({ ...r, [p.id]: v }))}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" onClick={fechar} disabled={enviando}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={!completa || enviando}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {enviando ? 'Enviando…' : 'Enviar resposta'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PerguntaPREM({
  pergunta, numero, valor, onSelect,
}: {
  pergunta: PremPergunta
  numero: number
  valor: number | undefined
  onSelect: (v: number) => void
}) {
  if (pergunta.tipo === 'nps10') {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-700 mb-2">
          <span className="text-slate-400 mr-1">{numero}.</span>
          {pergunta.texto}
        </p>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              className={cn(
                'h-9 w-9 rounded-md border text-sm font-bold transition-colors',
                valor === n
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
          <span>Não recomendaria</span>
          <span>Recomendaria com certeza</span>
        </div>
        {valor !== undefined && (
          <p className="mt-2 text-xs font-semibold">
            {valor <= 6 && <span className="text-red-600">Detrator</span>}
            {valor >= 7 && valor <= 8 && <span className="text-amber-600">Neutro</span>}
            {valor >= 9 && <span className="text-emerald-600">Promotor 🎉</span>}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-sm text-slate-700 mb-2">
        <span className="text-slate-400 mr-1">{numero}.</span>
        {pergunta.texto}
      </p>
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((v) => {
          const ativo = valor === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelect(v)}
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
  )
}
