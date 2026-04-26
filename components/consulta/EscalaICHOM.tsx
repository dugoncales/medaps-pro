'use client'

import { useMemo } from 'react'
import {
  ESCALAS,
  calcularResultado,
  escalaCompleta,
  type EscalaCodigo,
  type AlertaEscala,
  type Pergunta,
} from '@/lib/escalas/ichom'
import { cn } from '@/lib/utils'

interface EscalaICHOMProps {
  codigo: EscalaCodigo
  respostas: Record<string, number>
  onChange: (respostas: Record<string, number>) => void
  onRemover?: () => void
  className?: string
}

export function EscalaICHOM({ codigo, respostas, onChange, onRemover, className }: EscalaICHOMProps) {
  const def = ESCALAS[codigo]
  const completa = escalaCompleta(codigo, respostas)
  const resultado = useMemo(() => {
    return Object.keys(respostas).length > 0 ? calcularResultado(codigo, respostas) : null
  }, [codigo, respostas])

  function setResposta(id: string, valor: number) {
    onChange({ ...respostas, [id]: valor })
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800">{def.nome}</h3>
            {completa && resultado && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                ✓ Completo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{def.descricao}</p>
        </div>
        {onRemover && (
          <button
            type="button"
            onClick={onRemover}
            className="text-xs text-slate-400 hover:text-red-500"
            aria-label="Remover escala"
          >
            ✕ Remover
          </button>
        )}
      </div>

      {/* Score em destaque */}
      {resultado && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{resultado.score}</span>
            <span className="text-xs text-blue-600">
              / {def.scoreRange[1]}
            </span>
            <span className="ml-auto text-sm font-semibold text-blue-700">{resultado.classificacao}</span>
          </div>
          {!completa && (
            <p className="mt-1 text-[11px] text-blue-500">
              Score parcial — preencha todas as perguntas para resultado final.
            </p>
          )}
        </div>
      )}

      {/* Alertas clínicos */}
      {resultado?.alertas.map((a, i) => (
        <BannerAlerta key={i} alerta={a} />
      ))}

      {/* Perguntas */}
      <div className="space-y-3">
        {def.perguntas.map((p, idx) => (
          <PerguntaCampo
            key={p.id}
            pergunta={p}
            numero={idx + 1}
            valor={respostas[p.id]}
            onSelect={(v) => setResposta(p.id, v)}
            destacar={codigo === 'PHQ9' && p.id === 'p9'}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Pergunta ────────────────────────────────────────────────────────────────

function PerguntaCampo({
  pergunta, numero, valor, onSelect, destacar,
}: {
  pergunta: Pergunta
  numero: number
  valor: number | undefined
  onSelect: (v: number) => void
  destacar?: boolean
}) {
  if (pergunta.tipo === 'slider' && pergunta.slider) {
    const v = valor ?? pergunta.slider.min
    return (
      <div className="rounded-lg border border-slate-100 p-3">
        <p className="text-sm font-medium text-slate-700 mb-2">
          <span className="text-slate-400 mr-1">{numero}.</span>
          {pergunta.texto}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={pergunta.slider.min}
            max={pergunta.slider.max}
            step={pergunta.slider.step ?? 1}
            value={v}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="min-w-[60px] text-right text-sm font-bold text-blue-700">
            {v}{pergunta.slider.sufixo ?? ''}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        destacar ? 'border-red-200 bg-red-50/40' : 'border-slate-100',
      )}
    >
      <p className="text-sm font-medium text-slate-700 mb-2">
        <span className="text-slate-400 mr-1">{numero}.</span>
        {pergunta.texto}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {pergunta.opcoes?.map((opt) => {
          const ativo = valor === opt.valor
          return (
            <button
              key={opt.valor}
              type="button"
              onClick={() => onSelect(opt.valor)}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                ativo
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50',
              )}
            >
              <span className="mr-1 font-bold">{opt.valor}</span>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Banner de alerta ────────────────────────────────────────────────────────

function BannerAlerta({ alerta }: { alerta: AlertaEscala }) {
  const styles = {
    'amarelo': {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      title: 'text-amber-800',
      text: 'text-amber-700',
      icon: '⚠️',
    },
    'vermelho': {
      border: 'border-red-300',
      bg: 'bg-red-50',
      title: 'text-red-800',
      text: 'text-red-700',
      icon: '🚨',
    },
    'vermelho-urgente': {
      border: 'border-red-400 ring-2 ring-red-300 animate-pulse',
      bg: 'bg-red-100',
      title: 'text-red-900 font-extrabold uppercase tracking-wide',
      text: 'text-red-800',
      icon: '🆘',
    },
  }[alerta.nivel]

  return (
    <div className={cn('rounded-lg border-2 px-4 py-3', styles.border, styles.bg)}>
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5">{styles.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-bold', styles.title)}>
            {alerta.nivel === 'vermelho-urgente' && 'URGENTE — '}
            {alerta.mensagem}
          </p>
          {alerta.recomendacao && (
            <p className={cn('mt-1 text-xs leading-relaxed', styles.text)}>
              {alerta.recomendacao}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
