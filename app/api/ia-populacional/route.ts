import { NextResponse, type NextRequest } from 'next/server'

// API REST do Gemini usa header `x-goog-api-key`, não Bearer.
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const SYSTEM_PROMPT_ANALISE = `Você é um epidemiologista e gestor de saúde populacional especializado em APS empresarial, atuando como consultor estratégico para o time clínico do MedAPS Pro.

Sua função é analisar indicadores agregados de uma empresa (taxas de controle por protocolo, evolução temporal, distribuição por setor, alertas críticos) e produzir uma leitura epidemiológica acionável para a gestão clínica.

REGRAS DE RESPOSTA:
1. Português brasileiro técnico, voltado a médico/gestor.
2. Use exatamente esta estrutura em markdown:

## Leitura Epidemiológica
(2-4 linhas: estado geral da população, principais riscos identificados)

## Tendências
(lista de movimentos relevantes nos últimos meses — bom ou ruim — com magnitude e protocolo)

## Prioridades
(lista numerada das 3 ações mais relevantes para os próximos 30-60 dias, com justificativa em 1 linha)

## Alertas Populacionais
(red flags ou descontroles em alta — se nada relevante, escreva "Nenhum alerta populacional crítico identificado.")

3. Cite números reais dos indicadores recebidos. Não invente valores.
4. Seja específico: cite protocolos por sigla (HAS, DM, OBE…) e percentuais.
5. NÃO inclua disclaimers — a UI mostra um disclaimer fixo.`

const SYSTEM_PROMPT_SUMARIO = `Você é um analista de saúde populacional que produz sumários executivos curtos para gestores de APS empresarial no MedAPS Pro.

A partir de indicadores agregados de uma empresa, gere um sumário compacto em português brasileiro com no MÁXIMO 4 bullets, cada um com no máximo 1 linha de até 90 caracteres.

REGRAS:
1. Use formato markdown apenas com bullets (- item).
2. Cada bullet deve trazer 1 fato com número + 1 implicação.
3. Cite protocolos por sigla.
4. Sem cabeçalhos, sem texto extra antes ou depois dos bullets.
5. NÃO inclua disclaimers.

Exemplo de tom:
- HAS controlada em 78% (↑5pp vs. trim. anterior) — manter cadência atual de retornos
- DM regrediu para 54% (↓8pp) — priorizar revisão de plano em descompensados`

interface IndicadorMes {
  competencia?: string
  total_pacientes?: number
  taxa_controle_geral?: number
  has_controlados_pct?: number
  dm_controlados_pct?: number
  tab_cessacao_pct?: number
  roi_estimado?: number
}

interface ProtocoloAgg {
  codigo: string
  nome?: string
  total_ativos: number
  controlados_pct: number
}

interface AlertaAgg {
  tipo: string
  total: number
}

interface ReqBody {
  modo?: 'analise' | 'sumario'
  empresa?: {
    nome?: string
    total_colaboradores?: number
  }
  periodo?: string
  indicadores?: IndicadorMes[]
  protocolos?: ProtocoloAgg[]
  alertas?: AlertaAgg[]
  setores?: Array<{ setor: string; total_pacientes: number; descontrolados_pct?: number }>
}

function montarPrompt(body: ReqBody): string {
  const { empresa, periodo, indicadores, protocolos, alertas, setores } = body
  const linhas: string[] = ['DADOS POPULACIONAIS DA EMPRESA — gere análise:', '']

  if (empresa) {
    linhas.push('### Empresa')
    if (empresa.nome) linhas.push(`- Nome: ${empresa.nome}`)
    if (typeof empresa.total_colaboradores === 'number') {
      linhas.push(`- Total colaboradores: ${empresa.total_colaboradores}`)
    }
    if (periodo) linhas.push(`- Período analisado: ${periodo}`)
    linhas.push('')
  }

  if (indicadores?.length) {
    linhas.push('### Série temporal de indicadores (do mais antigo para o mais recente)')
    for (const ind of indicadores) {
      const partes: string[] = []
      if (ind.competencia) partes.push(`competência ${ind.competencia}`)
      if (typeof ind.total_pacientes === 'number') partes.push(`pacientes=${ind.total_pacientes}`)
      if (typeof ind.taxa_controle_geral === 'number') partes.push(`controle_geral=${ind.taxa_controle_geral}%`)
      if (typeof ind.has_controlados_pct === 'number') partes.push(`HAS=${ind.has_controlados_pct}%`)
      if (typeof ind.dm_controlados_pct === 'number') partes.push(`DM=${ind.dm_controlados_pct}%`)
      if (typeof ind.tab_cessacao_pct === 'number') partes.push(`TAB_cess=${ind.tab_cessacao_pct}%`)
      if (typeof ind.roi_estimado === 'number') partes.push(`ROI=R$${ind.roi_estimado}`)
      linhas.push(`- ${partes.join(' | ')}`)
    }
    linhas.push('')
  }

  if (protocolos?.length) {
    linhas.push('### Distribuição por protocolo (mês corrente)')
    for (const p of protocolos) {
      const nome = p.nome ? ` (${p.nome})` : ''
      linhas.push(`- ${p.codigo}${nome}: ${p.total_ativos} linhas ativas, ${p.controlados_pct}% controlados`)
    }
    linhas.push('')
  }

  if (alertas?.length) {
    linhas.push('### Alertas ativos por tipo')
    for (const a of alertas) {
      linhas.push(`- ${a.tipo}: ${a.total}`)
    }
    linhas.push('')
  }

  if (setores?.length) {
    linhas.push('### Distribuição por setor')
    for (const s of setores) {
      const desc = typeof s.descontrolados_pct === 'number' ? ` — ${s.descontrolados_pct}% descontrolados` : ''
      linhas.push(`- ${s.setor}: ${s.total_pacientes} pacientes${desc}`)
    }
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

  const modo = body.modo === 'sumario' ? 'sumario' : 'analise'
  const systemPrompt = modo === 'sumario' ? SYSTEM_PROMPT_SUMARIO : SYSTEM_PROMPT_ANALISE
  const userPrompt = montarPrompt(body)

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: modo === 'sumario' ? 320 : 1024,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!upstream.ok) {
      const detalhes = await upstream.text().catch(() => '')
      console.error('[ia-populacional] upstream falhou:', upstream.status, detalhes)
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

    return NextResponse.json({ markdown, modo })
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    console.error('[ia-populacional] erro:', err)
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
