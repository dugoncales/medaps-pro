'use client'

import { useEffect, useState } from 'react'

/**
 * Pequeno hook para o UX de rate limit das chamadas Gemini.
 *
 * Quando `gerar()` recebe 429, o panel chama `marcar()` — isso registra
 * o instante e dispara um countdown de 60s. Enquanto `segundosRestantes > 0`,
 * o botão de retry deve ficar oculto/desabilitado e a mensagem específica
 * de rate limit fica visível. Ao zerar, `segundosRestantes` cai para 0 e o
 * botão "Tentar novamente" volta a aparecer.
 */
export function useRateLimitCountdown(duracaoSegundos = 60) {
  const [marcadoEm, setMarcadoEm] = useState<number | null>(null)
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    if (marcadoEm === null) return
    const interval = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [marcadoEm])

  const segundosRestantes =
    marcadoEm === null
      ? 0
      : Math.max(0, duracaoSegundos - Math.floor((agora - marcadoEm) / 1000))

  const ativo = marcadoEm !== null && segundosRestantes > 0

  function marcar() {
    setMarcadoEm(Date.now())
    setAgora(Date.now())
  }

  function limpar() {
    setMarcadoEm(null)
  }

  return { ativo, segundosRestantes, marcar, limpar }
}
