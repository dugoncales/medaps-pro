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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { gerarId } from '@/lib/store/runtime-store'
import { cn } from '@/lib/utils'

type Canal = 'whatsapp' | 'email' | 'link'

interface ModalEnviarEscalaProps {
  aberto: boolean
  onFechar: () => void
  paciente: { id: string; nome: string }
  empresaId: string
  /** Para PROMs: código ICHOM (PHQ9, GAD7, etc). Para PREMs: 'PREM-GLOBAL', 'PREM-AMPLIADO' ou 'PREM-PROTOCOLO' */
  escalaCodigo: string
  escalaNome: string
  tipo: 'prom' | 'prem'
  premCodigo?: 'GLOBAL' | 'AMPLIADO' | 'PROTOCOLO'
  protocoloCodigo?: string
  profissionalId?: string
}

function gerarTokenLocal(): string {
  // Token base64url ~32 chars (apenas para demo mode)
  const bytes = new Uint8Array(24)
  if (typeof crypto !== 'undefined') crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function ModalEnviarEscala(props: ModalEnviarEscalaProps) {
  // Wrapper: monta apenas quando aberto, garantindo estado fresco a cada abertura.
  if (!props.aberto) return null
  return <ModalEnviarEscalaInner {...props} />
}

function ModalEnviarEscalaInner({
  onFechar, paciente, empresaId, escalaCodigo, escalaNome,
  tipo, premCodigo, protocoloCodigo, profissionalId,
}: ModalEnviarEscalaProps) {
  const primeiroNome = (paciente.nome ?? '').split(' ').filter(Boolean)[0] ?? ''
  const mensagemPadrao = `Olá ${primeiroNome}! Antes da nossa próxima consulta, por favor preencha esta escala (leva menos de 2 minutos). Obrigado!`

  const [canal, setCanal] = useState<Canal>('link')
  const [destino, setDestino] = useState('')
  const [mensagem, setMensagem] = useState(mensagemPadrao)
  const [enviando, setEnviando] = useState(false)
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  async function enviar() {
    setEnviando(true)
    setErro(null)
    try {
      let token: string
      let envioId: string

      if (IS_DEMO_MODE) {
        token = gerarTokenLocal()
        envioId = gerarId('env')
      } else {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('envios_escalas')
          .insert({
            paciente_id: paciente.id,
            empresa_id: empresaId,
            escala_codigo: escalaCodigo,
            tipo,
            prem_codigo: premCodigo,
            protocolo_codigo: protocoloCodigo,
            enviado_por: profissionalId,
            canal,
            destino: destino || null,
            mensagem,
            status: canal === 'link' ? 'pendente' : 'enviado',
          })
          .select('id, token')
          .single()
        if (error) throw error
        token = data.token
        envioId = data.id
      }

      const link = `${baseUrl}/escala/${token}`
      setLinkGerado(link)

      if (canal === 'whatsapp' && destino) {
        const numeroLimpo = destino.replace(/\D/g, '')
        const texto = encodeURIComponent(`${mensagem}\n\n${link}`)
        window.open(`https://wa.me/${numeroLimpo}?text=${texto}`, '_blank')
      } else if (canal === 'email' && destino) {
        const subject = encodeURIComponent(`MedAPS Pro — Escala: ${escalaNome}`)
        const body = encodeURIComponent(`${mensagem}\n\n${link}`)
        window.location.href = `mailto:${destino}?subject=${subject}&body=${body}`
      } else if (canal === 'link') {
        try { await navigator.clipboard.writeText(link) } catch { /* ignore */ }
      }

      // Em demo, só armazena id internamente
      void envioId
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao gerar envio'
      setErro(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>📱 Enviar para paciente</DialogTitle>
          <DialogDescription className="text-xs">
            <strong>{escalaNome}</strong> para <strong>{paciente.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        {linkGerado ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-700">✓ Envio criado com sucesso</p>
              <p className="mt-1 text-[11px] text-emerald-700/80">
                {canal === 'link' && 'O link foi copiado para sua área de transferência.'}
                {canal === 'whatsapp' && 'O WhatsApp foi aberto em uma nova aba.'}
                {canal === 'email' && 'Seu cliente de e-mail foi aberto.'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Link de acesso</p>
              <input
                type="text"
                readOnly
                value={linkGerado}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
              />
              <p className="mt-1 text-[10px] text-slate-400">Válido por 7 dias.</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={onFechar} className="bg-blue-600 hover:bg-blue-500">Fechar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Canal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Como enviar?</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'whatsapp', label: '📱 WhatsApp' },
                  { v: 'email',    label: '✉️ E-mail' },
                  { v: 'link',     label: '🔗 Copiar link' },
                ] as { v: Canal; label: string }[]).map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setCanal(opt.v)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                      canal === opt.v
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Destino */}
            {canal !== 'link' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {canal === 'whatsapp' ? 'Número (com DDI/DDD)' : 'E-mail'}
                </label>
                <Input
                  type={canal === 'email' ? 'email' : 'tel'}
                  placeholder={canal === 'whatsapp' ? '+55 11 9 9999-9999' : 'paciente@email.com'}
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {/* Mensagem */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mensagem personalizada
              </label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                className="mt-1 text-sm"
              />
            </div>

            {erro && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {erro}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" onClick={onFechar} disabled={enviando}>Cancelar</Button>
              <Button
                onClick={enviar}
                disabled={enviando || (canal !== 'link' && !destino.trim())}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {enviando ? 'Gerando…' : 'Enviar →'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
