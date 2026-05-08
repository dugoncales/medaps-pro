import { NextResponse, type NextRequest } from 'next/server'

// API Gemini REST aceita a key como query param `?key=` — é a forma
// canônica para keys do AI Studio. Header `x-goog-api-key` também
// funciona, mas algumas rotas/edge regions retornam 404 silencioso, então
// padronizamos no query param para ter um único caminho de auth.
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
// 2.5 Flash preview tem cota separada do 2.0 — útil quando o tier free do 2.0
// satura. Fallback para 2.0 cobre o caso do preview ficar indisponível.
const GEMINI_MODEL_PRIMARY = 'gemini-2.5-flash-preview-05-20'
const GEMINI_MODEL_FALLBACK = 'gemini-2.0-flash'

const RATE_LIMIT_MAX_RETRIES = 2
const RATE_LIMIT_BASE_DELAY_MS = 2000

function buildUrl(model: string, apiKey: string): string {
  return `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

const SYSTEM_PROMPT = `Você é um consultor clínico especializado em Medicina do Trabalho e Atenção Primária à Saúde (APS) corporativa, atuando como apoio à decisão para o profissional médico do MedAPS Pro.

Suas sugestões devem se basear nos protocolos operacionais (POPs) do MedAPS, incluindo entre outros:
- HAS (Hipertensão), DM (Diabetes), OBE (Obesidade), DIS (Dislipidemia)
- SM (Saúde Mental — depressão/ansiedade), TAB (Tabagismo), HIP (Hipotireoidismo)
- DPC (DPOC), SME (Síndrome Metabólica), TAG (TAG), CEF (Cefaleia)
- GOT (Gota), ALC (Álcool/AUDIT), ASM (Asma), SAO (Apneia do Sono)
- DRM (Dermatites ocupacionais), HOM/MUL (Saúde do homem/mulher), LOM (Lombalgia)

REGRAS DE RESPOSTA:
1. Responda SEMPRE em português brasileiro técnico, voltado a médico.
2. Use exatamente esta estrutura em markdown, sem texto extra antes ou depois:

## Impressão Clínica
(síntese diagnóstica em 2-4 linhas, considerando comorbidades e contexto ocupacional)

## Conduta Sugerida
(prescrições, ajustes terapêuticos, orientações — em lista)

## Próximos Passos
(exames a solicitar, encaminhamentos, retorno sugerido — em lista)

## Alertas
(sinais de alarme, contraindicações, red flags — em lista; se nada relevante, escreva "Nenhum sinal de alarme identificado.")

## Referências
(POPs do MedAPS aplicáveis e/ou diretrizes — uma linha por referência)

3. Se faltarem dados essenciais, sinalize a lacuna em "Próximos Passos" como exame/anamnese a complementar.
4. NÃO inclua disclaimers no final — o sistema já mostra um disclaimer fixo na UI.
5. Mantenha sugestões alinhadas a diretrizes nacionais (SBC, SBD, ABEAD, MS) quando aplicável.`

interface ReqBody {
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

function montarPrompt(body: ReqBody): string {
  const { paciente, protocolos, proms, sinaisVitais, queixa } = body

  const linhas: string[] = ['CASO CLÍNICO ATUAL — gere apoio à conduta:', '']

  if (paciente) {
    linhas.push('### Paciente')
    if (paciente.nome) linhas.push(`- Nome: ${paciente.nome}`)
    if (paciente.idade) linhas.push(`- Idade: ${paciente.idade} anos`)
    if (paciente.sexo) linhas.push(`- Sexo: ${paciente.sexo}`)
    if (paciente.setor) linhas.push(`- Setor: ${paciente.setor}`)
    if (paciente.comorbidades?.length) linhas.push(`- Comorbidades cadastradas: ${paciente.comorbidades.join(', ')}`)
    if (paciente.medicamentos_uso) linhas.push(`- Medicamentos em uso: ${paciente.medicamentos_uso}`)
    if (paciente.tabagismo_status && paciente.tabagismo_status !== 'nunca') {
      linhas.push(`- Tabagismo: ${paciente.tabagismo_status}`)
    }
    linhas.push('')
  }

  if (protocolos?.length) {
    linhas.push('### Linhas de cuidado ativas')
    for (const p of protocolos) {
      const nome = p.nome ? ` (${p.nome})` : ''
      const grav = p.nivel_gravidade ? ` — gravidade: ${p.nivel_gravidade}` : ''
      linhas.push(`- ${p.codigo}${nome}${grav}`)
    }
    linhas.push('')
  }

  if (sinaisVitais && Object.keys(sinaisVitais).length > 0) {
    linhas.push('### Sinais vitais desta consulta')
    if (sinaisVitais.pa_sistolica && sinaisVitais.pa_diastolica) {
      linhas.push(`- PA: ${sinaisVitais.pa_sistolica}/${sinaisVitais.pa_diastolica} mmHg`)
    }
    if (sinaisVitais.fc) linhas.push(`- FC: ${sinaisVitais.fc} bpm`)
    if (sinaisVitais.spo2) linhas.push(`- SpO₂: ${sinaisVitais.spo2}%`)
    if (sinaisVitais.peso) linhas.push(`- Peso: ${sinaisVitais.peso} kg`)
    if (sinaisVitais.imc) linhas.push(`- IMC: ${sinaisVitais.imc}`)
    if (sinaisVitais.temperatura) linhas.push(`- T: ${sinaisVitais.temperatura} °C`)
    linhas.push('')
  }

  if (proms && Object.keys(proms).length > 0) {
    linhas.push('### Escalas/PROMs aplicadas')
    for (const [k, v] of Object.entries(proms)) {
      linhas.push(`- ${k}: ${v}`)
    }
    linhas.push('')
  }

  if (queixa?.trim()) {
    linhas.push('### Queixa principal / Subjetivo')
    linhas.push(queixa.trim())
    linhas.push('')
  }

  return linhas.join('\n')
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY não configurada no servidor.' },
      { status: 503 },
    )
  }

  let body: ReqBody
  try {
    body = (await request.json()) as ReqBody
  } catch {
    return NextResponse.json({ error: 'Corpo inválido (JSON esperado).' }, { status: 400 })
  }

  const userPrompt = montarPrompt(body)

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  })

  async function callGemini(model: string) {
    return fetch(buildUrl(model, apiKey!), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: AbortSignal.timeout(30_000),
    })
  }

  // Retry com backoff exponencial em 429. Total de tentativas =
  // 1 inicial + RATE_LIMIT_MAX_RETRIES. Outros status retornam imediatamente.
  async function callComRetry(model: string): Promise<Response> {
    let delay = RATE_LIMIT_BASE_DELAY_MS
    for (let tentativa = 0; tentativa <= RATE_LIMIT_MAX_RETRIES; tentativa++) {
      const res = await callGemini(model)
      if (res.status !== 429) return res
      if (tentativa === RATE_LIMIT_MAX_RETRIES) return res
      console.warn(`[Gemini] 429 (tentativa ${tentativa + 1}); aguardando ${delay}ms`)
      await sleep(delay)
      delay *= 2
    }
    // unreachable — for-loop sempre retorna no última iteração
    return callGemini(model)
  }

  try {
    let upstream = await callComRetry(GEMINI_MODEL_PRIMARY)
    console.log('[Gemini] status:', upstream.status)

    // 404 → modelo primário pode ter sido descontinuado; tenta fallback.
    if (upstream.status === 404) {
      console.warn('[Gemini] 404 no modelo primário; tentando fallback', GEMINI_MODEL_FALLBACK)
      upstream = await callComRetry(GEMINI_MODEL_FALLBACK)
      console.log('[Gemini] status (fallback):', upstream.status)
    }

    if (upstream.status === 429) {
      return NextResponse.json(
        {
          error:
            'IA temporariamente indisponível — limite de requisições atingido. Tente novamente em 1 minuto.',
          code: 'rate_limit',
        },
        { status: 429 },
      )
    }

    if (!upstream.ok) {
      const detalhes = await upstream.text().catch(() => '')
      console.error('[ia-clinica] upstream falhou:', upstream.status, detalhes)
      return NextResponse.json(
        { error: `Gemini retornou ${upstream.status}. Tente novamente em instantes.` },
        { status: 502 },
      )
    }

    const data = await upstream.json()
    const markdown =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''

    if (!markdown) {
      return NextResponse.json(
        { error: 'Resposta vazia do modelo.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ markdown })
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    console.error('[ia-clinica] erro:', err)
    return NextResponse.json(
      {
        error: isTimeout
          ? 'Tempo esgotado (30s) aguardando resposta do Gemini.'
          : 'Falha ao consultar IA. Verifique a conexão e tente novamente.',
      },
      { status: isTimeout ? 504 : 500 },
    )
  }
}
