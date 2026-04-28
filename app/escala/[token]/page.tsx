'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { Button } from '@/components/ui/button'
import {
  ESCALAS,
  calcularResultado,
  escalaCompleta,
  type EscalaCodigo,
} from '@/lib/escalas/ichom'
import {
  PREMS_DEFINICOES,
  perguntasPorProtocolo,
  premCompleto,
  calcularResultadoPREM,
  LIKERT_LABELS,
  type PremCodigo,
  type PremPergunta,
  type RespostasPREM,
} from '@/lib/escalas/prems'
import {
  avaliarAlertaCriticoPROM,
  avaliarAlertaCriticoPREM,
  type AlertaPayload,
} from '@/lib/escalas/alertas-criticos'
import { cn } from '@/lib/utils'

interface EnvioInfo {
  envio_id: string
  paciente_nome: string
  paciente_id: string
  escala_codigo: string
  tipo: 'prom' | 'prem'
  prem_codigo: PremCodigo | null
  protocolo_codigo: string | null
  status: 'pendente' | 'enviado' | 'aberto' | 'respondido' | 'expirado'
  expirado: boolean
  protocolos_ativos: string[]
}

type Estado = 'carregando' | 'pronta' | 'respondida' | 'expirada' | 'invalida' | 'enviado'

export default function EscalaPublicaPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [estado, setEstado] = useState<Estado>(() => IS_DEMO_MODE ? 'invalida' : 'carregando')
  const [envio, setEnvio] = useState<EnvioInfo | null>(null)
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [enviandoResp, setEnviandoResp] = useState(false)
  const [erroSubmit, setErroSubmit] = useState<string | null>(null)

  useEffect(() => {
    if (!token || IS_DEMO_MODE) return

    const supabase = createClient()

    async function carregar() {
      const { data, error } = await supabase
        .rpc('get_escala_by_token', { p_token: token })

      if (error || !data || data.length === 0) {
        setEstado('invalida')
        return
      }

      const e = data[0] as EnvioInfo
      setEnvio(e)

      if (e.expirado) { setEstado('expirada'); return }
      if (e.status === 'respondido') { setEstado('respondida'); return }
      setEstado('pronta')

      if (e.status === 'pendente' || e.status === 'enviado') {
        await supabase.rpc('marcar_envio_aberto', { p_token: token })
      }
    }
    carregar()
  }, [token])

  if (estado === 'carregando') return <Tela><p className="text-sm text-slate-500">Carregando…</p></Tela>
  if (estado === 'invalida') return <Tela><Mensagem titulo="Link inválido" texto="Este link não foi encontrado ou já não está disponível." erro /></Tela>
  if (estado === 'expirada') return <Tela><Mensagem titulo="Link expirado" texto="Este link expirou. Por favor, peça um novo ao seu profissional de saúde." erro /></Tela>
  if (estado === 'respondida') return <Tela><Mensagem titulo="Já respondida" texto="Esta escala já foi respondida — obrigado!" /></Tela>
  if (estado === 'enviado') return <Tela><Mensagem titulo="Obrigado!" texto="Sua resposta foi registrada. Nossa equipe agradece pela colaboração." /></Tela>
  if (!envio) return null

  // ── Renderização do formulário ─────────────────────────────────
  const isPROM = envio.tipo === 'prom'
  const escalaIchom = isPROM ? ESCALAS[envio.escala_codigo as EscalaCodigo] : null
  const premDef = !isPROM && envio.prem_codigo ? PREMS_DEFINICOES[envio.prem_codigo] : null
  const perguntasPrem: PremPergunta[] | null = premDef
    ? (envio.prem_codigo === 'PROTOCOLO'
        ? perguntasPorProtocolo(envio.protocolos_ativos)
        : premDef.perguntas)
    : null

  const titulo = escalaIchom?.nome ?? premDef?.nome ?? envio.escala_codigo
  const descricao = escalaIchom?.descricao ?? premDef?.descricao ?? ''

  const completa = isPROM
    ? escalaIchom ? escalaCompleta(envio.escala_codigo as EscalaCodigo, respostas) : false
    : envio.prem_codigo ? premCompleto(envio.prem_codigo, respostas as RespostasPREM, envio.protocolos_ativos) : false

  async function handleSubmit() {
    if (!completa || !envio) return
    setEnviandoResp(true)
    setErroSubmit(null)

    let score = 0
    let classificacao = ''
    let alertaPayload: AlertaPayload | null = null
    if (isPROM && escalaIchom) {
      const r = calcularResultado(envio.escala_codigo as EscalaCodigo, respostas)
      score = r.score
      classificacao = r.classificacao
      alertaPayload = avaliarAlertaCriticoPROM(envio.escala_codigo as EscalaCodigo, {
        score: r.score,
        classificacao: r.classificacao,
        respostas: r.respostas,
      })
    } else if (envio.prem_codigo) {
      const r = calcularResultadoPREM(envio.prem_codigo, respostas, envio.protocolos_ativos)
      score = r.score
      classificacao = r.classificacao
      alertaPayload = avaliarAlertaCriticoPREM(envio.prem_codigo, r)
    }

    const supabase = createClient()
    const { data, error } = await supabase.rpc('submit_escala_resposta', {
      p_token: token,
      p_respostas: respostas,
      p_score: score,
      p_classificacao: classificacao,
      p_alerta: alertaPayload
        ? {
            tipo: alertaPayload.tipo,
            prioridade: alertaPayload.prioridade,
            titulo: alertaPayload.titulo,
            descricao: alertaPayload.descricao,
            protocolo_codigo: envio.protocolo_codigo,
          }
        : null,
    })

    setEnviandoResp(false)

    if (error) { setErroSubmit(error.message); return }
    const ok = Array.isArray(data) ? data[0]?.ok : (data as { ok: boolean } | null)?.ok
    const msg = Array.isArray(data) ? data[0]?.mensagem : (data as { mensagem: string } | null)?.mensagem
    if (!ok) { setErroSubmit(msg ?? 'Não foi possível registrar a resposta'); return }
    setEstado('enviado')
  }

  return (
    <Tela>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
        <p className="text-sm text-slate-500 mt-1">{descricao}</p>
        <p className="text-xs text-slate-400 mt-1">Olá, {envio.paciente_nome.split(' ')[0]} 👋</p>
      </div>

      <div className="space-y-3">
        {isPROM && escalaIchom && escalaIchom.perguntas.map((p, idx) => (
          <PerguntaPROM
            key={p.id}
            pergunta={p}
            numero={idx + 1}
            valor={respostas[p.id]}
            onSelect={(v) => setRespostas(r => ({ ...r, [p.id]: v }))}
          />
        ))}

        {!isPROM && perguntasPrem && perguntasPrem.map((p, idx) => (
          <PerguntaPREM
            key={p.id}
            pergunta={p}
            numero={idx + 1}
            valor={respostas[p.id]}
            onSelect={(v) => setRespostas(r => ({ ...r, [p.id]: v }))}
          />
        ))}
      </div>

      {erroSubmit && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {erroSubmit}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!completa || enviandoResp}
          className="bg-blue-600 hover:bg-blue-500"
        >
          {enviandoResp ? 'Enviando…' : 'Enviar resposta'}
        </Button>
      </div>
    </Tela>
  )
}

// ─── Layout público ──────────────────────────────────────────────────────────

function Tela({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E40AF]">
            <Activity className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">MedAPS Pro</p>
            <p className="text-[11px] text-slate-500">APS Empresarial</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  )
}

function Mensagem({ titulo, texto, erro }: { titulo: string; texto: string; erro?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="text-4xl">{erro ? '⚠️' : '🙏'}</span>
      <h1 className={cn('text-lg font-bold', erro ? 'text-red-700' : 'text-emerald-700')}>{titulo}</h1>
      <p className="text-sm text-slate-600 max-w-md">{texto}</p>
    </div>
  )
}

// ─── Inputs PROM ─────────────────────────────────────────────────────────────

function PerguntaPROM({
  pergunta, numero, valor, onSelect,
}: {
  pergunta: { id: string; texto: string; tipo: 'opcoes' | 'slider'; opcoes?: { valor: number; label: string }[]; slider?: { min: number; max: number; step?: number; sufixo?: string } }
  numero: number
  valor: number | undefined
  onSelect: (v: number) => void
}) {
  if (pergunta.tipo === 'slider' && pergunta.slider) {
    const v = valor ?? pergunta.slider.min
    return (
      <div className="rounded-lg border border-slate-100 p-3">
        <p className="text-sm font-medium text-slate-700 mb-2">
          <span className="text-slate-400 mr-1">{numero}.</span>{pergunta.texto}
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
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-sm font-medium text-slate-700 mb-2">
        <span className="text-slate-400 mr-1">{numero}.</span>{pergunta.texto}
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

// ─── Inputs PREM ─────────────────────────────────────────────────────────────

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
          <span className="text-slate-400 mr-1">{numero}.</span>{pergunta.texto}
        </p>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, i) => i).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              className={cn(
                'h-9 w-9 rounded-md border text-sm font-bold',
                valor === n
                  ? n <= 6 ? 'border-red-500 bg-red-600 text-white'
                    : n <= 8 ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-sm text-slate-700 mb-2">
        <span className="text-slate-400 mr-1">{numero}.</span>{pergunta.texto}
      </p>
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map(v => {
          const ativo = valor === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelect(v)}
              className={cn(
                'rounded-md border px-1 py-1.5 text-[10px] font-medium leading-tight',
                ativo
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-blue-50',
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
