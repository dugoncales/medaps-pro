// Helpers de formatação compartilhados.

/**
 * Formata uma matrícula para exibição padronizada.
 *
 * - Strings com letras/dashes (ex.: "MSP-001") → mantém como vieram, em maiúsculas
 * - Strings puramente numéricas (ex.: "5", "0007") → "MAT-0005", "MAT-0007"
 * - Vazio/null/undefined → "—"
 */
export function formatMatricula(matricula: string | null | undefined): string {
  if (!matricula) return '—'
  const trimmed = String(matricula).trim()
  if (!trimmed) return '—'
  if (/^\d+$/.test(trimmed)) {
    return `MAT-${trimmed.padStart(4, '0')}`
  }
  return trimmed.toUpperCase()
}
