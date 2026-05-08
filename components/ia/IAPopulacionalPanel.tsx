'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { renderMarkdownSafe } from '@/lib/markdown-safe'
import { useRateLimitCountdown } from '@/lib/use-rate-limit-countdown'

export interface IndicadorMesIA {
  competencia?: string
  total_pacientes?: number
  taxa_controle_geral?: number
  has_controlados_pct?: number
  dm_controlados_pct?: number
  tab_cessacao_pct?: number
  roi_estimado?: number
}

export interface ProtocoloAggIA {
  codigo: string
  nome?: string
  total_ativos: number
  controlados_pct: number
}

export interface AlertaAggIA {
  tipo: string
  total: number
}

export interface SetorAggIA {
  setor: string
  total_pacientes: number
  descontrolados_pct?: number
}

export interface PromptIAPopulacional {
  empresa?: { nome?: string; total_colaboradores?: number }
  periodo?: string
  indicadores?: IndicadorMesIA[]
  protocolos?: ProtocoloAggIA[]
  alertas?: AlertaAggIA[]
  setores?: SetorAggIA[]
}

interface Props {
  /** Identificador estável (ex.: empresaId) usado como chave de cache. */
  cacheKey: string
  entrada: PromptIAPopulacional
  /** 'analise' (longo) ou 'sumario' (4 bullets). */
  modo?: 'analise' | 'sumario'
  /** Quando true, busca automaticamente na primeira render (uma vez por cacheKey). */
  autoCarregar?: boolean
  iniciarAberto?: boolean
  /** Título mostrado no cabeçalho. */
  titulo?: string
}

const STORAGE_PREFIX = 'medaps:ia-populacional:'

export function IAPopulacionalPanel({
  cacheKey,
  entrada,
  modo = 'analise',
  autoCarregar = false,
  iniciarAberto = true,
  titulo,
}: Props) {
  const [aberto, setAberto] = useState(iniciarAberto)
  const [carregando, setCarregando] = useState(false)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const rateLimit = useRateLimitCountdown(60)

  const cacheId = `${STORAGE_PREFIX}${modo}:${cacheKey}`
  const tituloFinal = titulo ?? (modo === 'sumario' ? 'Insights da empresa' : 'Análise populacional')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const cached = window.sessionStorage.getItem(cacheId)
    if (cached) {
      setMarkdown(cached)
      return
    }
    if (autoCarregar) {
      void gerar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheId])

  async function gerar() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch('/api/ia-populacional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entrada, modo }),
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
        window.sessionStorage.setItem(cacheId, md)
      } catch {
        // sessionStorage cheio — segue sem cache
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha de rede.')
    } finally {
      setCarregando(false)
    }
  }

  function regerar() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(cacheId)
    }
    setMarkdown(null)
    void gerar()
  }

  const headingColor = modo === 'sumario' ? '#0F766E' : '#1E40AF'
  const bgGradient =
    modo === 'sumario'
      ? 'from-emerald-50/60 to-white border-emerald-200'
      : 'from-blue-50/60 to-white border-blue-200'
  const badgeClass =
    modo === 'sumario'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
      : 'border-blue-200 bg-blue-100 text-blue-700'
  const buttonClass = modo === 'sumario' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${bgGradient} shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={aberto}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" aria-hidden>📊</span>
          <span className="text-sm font-semibold text-slate-800">{tituloFinal}</span>
          <span className={`hidden sm:inline rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
            Gemini AI
          </span>
        </div>
        <span className="shrink-0 text-slate-400 text-sm">{aberto ? '▾' : '▸'}</span>
      </button>

      {aberto && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
          {!markdown && !carregando && !erro && (
            <p className="text-xs text-slate-500">
              {modo === 'sumario'
                ? 'Gera um sumário executivo (4 bullets) com os principais movimentos da empresa.'
                : 'Lê os indicadores da empresa e produz uma análise epidemiológica com tendências, prioridades e alertas populacionais.'}
            </p>
          )}

          {markdown ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(markdown, { headingColor }) }}
            />
          ) : carregando ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
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
              Sugestão de apoio à gestão clínica. Decisões finais cabem ao time responsável.
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
                  className={`${buttonClass} text-xs h-8 text-white`}
                >
                  {carregando ? 'Gerando…' : '✨ Gerar análise'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
