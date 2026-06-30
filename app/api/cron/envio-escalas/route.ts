import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ESCALAS } from '@/lib/escalas/ichom'

const PROTOCOLO_ESCALA_MAP: Record<string, string> = {
  SM:  'PHQ9',
  TAG: 'GAD7',
  DPC: 'CAT',
  ASM: 'ACQ5',
  SAO: 'ESS',
  CEF: 'HIT6',
  ALC: 'AUDITC',
  TAB: 'FAGERSTROM',
  CHK: 'PHQ2',
  HAS: 'EQ5D5L',
  DM:  'EQ5D5L',
  OBE: 'EQ5D5L',
  DIS: 'EQ5D5L',
  MUL: 'EPDS',
  HOM: 'IIEF5',
  DRM: 'DLQI',
}

const PRIORIDADE = ['SM','TAG','ALC','TAB','DPC','ASM','SAO','CEF','HAS','DM','OBE','DIS','CHK','MUL','HOM','DRM']

function escolherEscala(protocolos: string[]): { codigo: string; nome: string } | null {
  const ordenados = [...protocolos].sort(
    (a, b) => PRIORIDADE.indexOf(a) - PRIORIDADE.indexOf(b)
  )
  for (const p of ordenados) {
    const codigo = PROTOCOLO_ESCALA_MAP[p]
    if (!codigo) continue
    const escala = Object.values(ESCALAS).find(e => e.codigo === codigo)
    if (escala) return { codigo, nome: escala.nome }
  }
  return null
}

function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const agora = new Date()
  const janelaInicio = new Date(agora.getTime() + 23 * 60 * 60 * 1000)
  const janelaFim   = new Date(agora.getTime() + 25 * 60 * 60 * 1000)

  const { data: agendamentos, error: errAg } = await supabase
    .from('agendamentos')
    .select(`
      id,
      paciente_id,
      data_hora,
      protocolos_previstos,
      pacientes ( empresa_id )
    `)
    .eq('status', 'agendado')
    .gte('data_hora', janelaInicio.toISOString())
    .lte('data_hora', janelaFim.toISOString())

  if (errAg) {
    console.error('[cron/envio-escalas] erro ao buscar agendamentos:', errAg)
    return NextResponse.json({ error: errAg.message }, { status: 500 })
  }

  if (!agendamentos?.length) {
    return NextResponse.json({ enviados: 0, mensagem: 'Nenhum agendamento na janela' })
  }

  const ids = agendamentos.map(a => a.id)
  const { data: jaEnviados } = await supabase
    .from('envios_escalas')
    .select('agendamento_id')
    .in('agendamento_id', ids)

  const idsJaEnviados = new Set((jaEnviados ?? []).map((e: { agendamento_id: string }) => e.agendamento_id))
  const novos = agendamentos.filter(a => !idsJaEnviados.has(a.id))

  if (!novos.length) {
    return NextResponse.json({ enviados: 0, mensagem: 'Escalas já enviadas para todos os agendamentos' })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medaps-pro.vercel.app'

  const registros = novos.flatMap(ag => {
    const protocolos: string[] = ag.protocolos_previstos ?? []
    const escala = escolherEscala(protocolos)
    if (!escala) return []

    const token = gerarToken()
    const pac = Array.isArray(ag.pacientes) ? ag.pacientes[0] : ag.pacientes
    const empresaId = (pac as { empresa_id: string } | null)?.empresa_id ?? null

    return [{
      empresa_id:     empresaId,
      paciente_id:    ag.paciente_id,
      agendamento_id: ag.id,
      escala_codigo:  escala.codigo,
      escala_nome:    escala.nome,
      token,
      status:         'enviado',
      canal:          'link',
      link_publico:   `${baseUrl}/escala/${token}`,
      expires_at:     new Date(new Date(ag.data_hora).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    }]
  })

  if (!registros.length) {
    return NextResponse.json({ enviados: 0, mensagem: 'Nenhum protocolo mapeado para escala' })
  }

  const { error: errInsert } = await supabase
    .from('envios_escalas')
    .insert(registros)

  if (errInsert) {
    console.error('[cron/envio-escalas] erro ao inserir envios:', errInsert)
    return NextResponse.json({ error: errInsert.message }, { status: 500 })
  }

  console.log(`[cron/envio-escalas] ${registros.length} envios criados`)
  return NextResponse.json({ enviados: registros.length })
}
