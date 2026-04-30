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
import { EscalaICHOM } from '@/components/consulta/EscalaICHOM'
import {
  ESCALAS, calcularResultado, escalaCompleta, getEscalasParaProtocolos,
  type EscalaCodigo, type ResultadoEscala,
} from '@/lib/escalas/ichom'

interface ModalAplicarEscalaProps {
  aberto: boolean
  onFechar: () => void
  onSubmit: (codigo: EscalaCodigo, resultado: ResultadoEscala) => void
  /** Se fornecido, mostra o botão "Enviar para paciente →" na tela de confirmação. */
  onEnviar?: (codigo: EscalaCodigo) => void
  protocolosAtivos: string[]
}

export function ModalAplicarEscala(props: ModalAplicarEscalaProps) {
  // Wrapper: monta apenas quando aberto, garantindo state fresco a cada abertura.
  if (!props.aberto) return null
  return <ModalAplicarEscalaInner {...props} />
}

function ModalAplicarEscalaInner({
  onFechar, onSubmit, onEnviar, protocolosAtivos,
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
  const [confirmacao, setConfirmacao] = useState<{ codigo: EscalaCodigo; resultado: ResultadoEscala } | null>(null)

  // Progresso "X de Y respondidas"
  const totalPerguntas = codigo ? ESCALAS[codigo]?.perguntas?.length ?? 0 : 0
  const respondidas = codigo
    ? (ESCALAS[codigo]?.perguntas ?? []).filter((p) => respostas[p.id] !== undefined).length
    : 0
  const completo = codigo ? escalaCompleta(codigo, respostas) : false

  function escolherEscala(novoCodigo: EscalaCodigo | '') {
    setCodigo(novoCodigo === '' ? null : (novoCodigo as EscalaCodigo))
    setRespostas({}) // reset limpo ao trocar de escala
  }

  function salvar() {
    if (!codigo) return
    if (!escalaCompleta(codigo, respostas)) return
    const resultado = calcularResultado(codigo, respostas)
    onSubmit(codigo, resultado)
    setConfirmacao({ codigo, resultado })
  }

  function fechar() {
    onFechar()
  }

  // ─── Tela de confirmação após salvar ──────────────────────────────────────
  if (confirmacao) {
    const def = ESCALAS[confirmacao.codigo]
    const r = confirmacao.resultado
    const scoreMax = Array.isArray(def?.scoreRange) ? def.scoreRange[1] : '?'
    return (
      <Dialog open onOpenChange={(open) => !open && fechar()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✅ Escala salva</DialogTitle>
            <DialogDescription className="text-xs">
              {def?.nome ?? confirmacao.codigo} foi registrada no histórico do paciente.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Score</p>
            <p className="mt-1 text-4xl font-bold text-emerald-700">
              {r.score}
              <span className="text-base text-emerald-600/70 font-normal"> / {scoreMax}</span>
            </p>
            {r.classificacao && (
              <p className="mt-1 text-sm font-semibold text-emerald-800">{r.classificacao}</p>
            )}
          </div>

          {Array.isArray(r.alertas) && r.alertas.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ {r.alertas.length} alerta clínico{r.alertas.length > 1 ? 's' : ''} gerado{r.alertas.length > 1 ? 's' : ''} —
              veja no histórico.
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={fechar}>Fechar</Button>
            {onEnviar && (
              <Button
                onClick={() => {
                  onEnviar(confirmacao.codigo)
                  fechar()
                }}
                className="bg-blue-600 hover:bg-blue-500"
              >
                📱 Enviar para paciente →
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Tela de aplicação ────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(open) => !open && fechar()}>
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
              onChange={(e) => escolherEscala(e.target.value as EscalaCodigo | '')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {sugestoes.length > 0 && (
                <optgroup label="Sugeridas pelos protocolos">
                  {sugestoes.map((s) => {
                    const def = ESCALAS[s.codigo]
                    if (!def) return null
                    return (
                      <option key={s.codigo} value={s.codigo}>
                        {def.nome} {s.obrigatoria ? '· Obrigatória' : ''}
                      </option>
                    )
                  })}
                </optgroup>
              )}
              <optgroup label="Outras escalas">
                {codigosOutros.map((c) => {
                  const def = ESCALAS[c]
                  if (!def) return null
                  return <option key={c} value={c}>{def.nome}</option>
                })}
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

        {/* Progresso + ações */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          {codigo && totalPerguntas > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>{respondidas} de {totalPerguntas} {totalPerguntas === 1 ? 'pergunta respondida' : 'perguntas respondidas'}</span>
                <span className={completo ? 'text-emerald-700 font-semibold' : ''}>
                  {completo ? '✓ Pronto para salvar' : `Faltam ${totalPerguntas - respondidas}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full transition-all ${completo ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${totalPerguntas > 0 ? (respondidas / totalPerguntas) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
            <Button
              onClick={salvar}
              disabled={!completo}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Salvar resultado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
