// Renderer minimal de markdown — escapa HTML primeiro e converte o subset
// que os prompts da IA instruem o modelo a usar (h2, listas, **bold**,
// *italic*, `code`).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function aplicarInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-slate-100 px-1 text-xs font-mono">$1</code>')
}

export interface RenderMarkdownOptions {
  /** Cor do destaque dos h3 (default: azul). */
  headingColor?: string
}

export function renderMarkdownSafe(md: string, options: RenderMarkdownOptions = {}): string {
  const headingColor = options.headingColor ?? '#1E40AF'
  const escaped = escapeHtml(md)
  const linhas = escaped.split('\n')
  const out: string[] = []
  let listaAberta: 'ul' | 'ol' | null = null

  const flushLista = () => {
    if (listaAberta === 'ul') out.push('</ul>')
    else if (listaAberta === 'ol') out.push('</ol>')
    listaAberta = null
  }

  for (const raw of linhas) {
    const linha = raw.trim()

    if (!linha) {
      flushLista()
      continue
    }

    const h2 = linha.match(/^## (.+)$/)
    if (h2) {
      flushLista()
      out.push(
        `<h3 class="mt-4 mb-1.5 text-sm font-bold uppercase tracking-wide" style="color:${headingColor}">${h2[1]}</h3>`,
      )
      continue
    }

    const itemNumerado = linha.match(/^\d+[.)]\s+(.+)$/)
    if (itemNumerado) {
      if (listaAberta !== 'ol') {
        flushLista()
        out.push('<ol class="list-decimal pl-5 space-y-1 text-sm text-slate-700">')
        listaAberta = 'ol'
      }
      out.push(`<li>${aplicarInline(itemNumerado[1])}</li>`)
      continue
    }

    const item = linha.match(/^[-*] (.+)$/)
    if (item) {
      if (listaAberta !== 'ul') {
        flushLista()
        out.push('<ul class="list-disc pl-5 space-y-1 text-sm text-slate-700">')
        listaAberta = 'ul'
      }
      out.push(`<li>${aplicarInline(item[1])}</li>`)
      continue
    }

    flushLista()
    out.push(`<p class="text-sm text-slate-700 leading-relaxed">${aplicarInline(linha)}</p>`)
  }

  flushLista()
  return out.join('\n')
}
