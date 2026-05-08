'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { renderMarkdownSafe } from '@/lib/markdown-safe'
import { useRateLimitCountdown } from '@/lib/use-rate-limit-countdown'

export interface PromptIAEntrada {
  paciente?: {
    nome?: string
    idade?: number
    sexo?: string
    setor?: string
    comorbidades?: string[]
    medicamentos_uso?: string
    tabagismo_status?: string
  }
  protocolos?: Array<{ codigo: string; nome?: string; nivel_gravidade?: string }>
  proms?: Record<string, number | string>
  sinaisVitais?: {
    pa_sistolica?: number
    pa_diastolica?: number
    fc?: number
    spo2?: number
    peso?: number
    imc?: number
    temperatura?: number
  }
  queixa?: string
}

interface Props {
  pacienteId: string
  entrada: PromptIAEntrada
  /** Quando true, inicia expandido. Default: false. */
  iniciarAberto?: boolean
}

const STORAGE_PREFIX = 'medaps:ia-clinica:'

export function IAClinicalPanel({ pacienteId, entrada, iniciarAberto = false }: Props) {
  const [aberto, setAberto] = useState(iniciarAberto)
  const [carregando, setCarregando] = useState(false)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const rateLimit = useRateLimitCountdown(60)

  // Restaura cache da sessão para o paciente atual
  useEffect(() => {
    if (typeof window === 'undefined') return
    const cached = window.sessionStorage.getItem(STORAGE_PREFIX + pacienteId)
    if (cached) setMarkdown(cached)
  }, [pacienteId])

  async function gerar() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch('/api/ia-clinica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entrada),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429 || data?.code === 'rate_limit') {
        rateLimit.marcar()
        return
      }
      if (!res.ok) {
        setErro(data?.error ?? `Erro HTTP ${res.status}`)
        return
      }
      const md = data?.markdown as string | undefined
      if (!md) {
        setErro('Resposta vazia do modelo.')
        return
      }
      rateLimit.limpar()
      setMarkdown(md)
      try {
        window.sessionStorage.setItem(STORAGE_PREFIX + pacienteId, md)
      } catch {
        // sessionStorage cheio ou bloqueado — segue sem cache
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha de rede.')
    } finally {
      setCarregando(false)
    }
  }

  function regerar() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_PREFIX + pacienteId)
    }
    setMarkdown(null)
    void gerar()
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/60 to-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
      {/* Cabeçalho clicável */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={aberto}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" aria-hidden>🧠</span>
          <span className="text-sm font-semibold text-slate-800">Apoio à decisão clínica</span>
          <span className="hidden sm:inline rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
            Gemini AI
          </span>
        </div>
        <span className="shrink-0 text-slate-400 text-sm">{aberto ? '▾' : '▸'}</span>
      </button>

      {aberto && (
        <div className="border-t border-purple-100 px-4 py-4 space-y-3">
          {!markdown && !carregando && !erro && (
            <p className="text-xs text-slate-500">
              Use os dados do paciente (comorbidades, sinais vitais, escalas) para gerar uma sugestão
              de impressão clínica, conduta, próximos passos e alertas.
            </p>
          )}

          {markdown ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(markdown) }}
            />
          ) : carregando ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
              Consultando modelo… (até 30s)
            </div>
          ) : null}

          {rateLimit.ativo && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
              <span>⏳ Muitas requisições simultâneas. Aguarde 1 minuto e tente novamente.</span>
              <span className="font-mono font-bold tabular-nums shrink-0">{rateLimit.segundosRestantes}s</span>
            </div>
          )}

          {erro && !rateLimit.ativo && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ {erro}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[10px] text-slate-500 italic max-w-md">
              Sugestão de apoio. A decisão clínica é do profissional responsável.
            </p>
            <div className="flex gap-2 shrink-0">
              {rateLimit.ativo ? null : markdown ? (
                <Button
                  variant="outline"
                  onClick={regerar}
                  disabled={carregando}
                  className="text-xs h-8"
                >
                  {carregando ? 'Gerando…' : '🔄 Regerar'}
                </Button>
              ) : (
                <Button
                  onClick={gerar}
                  disabled={carregando}
                  className="bg-purple-600 hover:bg-purple-500 text-xs h-8"
                >
                  {carregando ? 'Gerando…' : '🧠 Gerar Sugestão IA'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
