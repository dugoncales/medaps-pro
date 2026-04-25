'use server'

import { IS_DEMO_MODE } from '@/lib/demo-data'
import { createClient } from '@/lib/supabase/server'

export async function avancarPasso(
  paciente_id: string,
  protocolo: string,
  _consulta_id: string
): Promise<void> {
  if (IS_DEMO_MODE) return

  const supabase = await createClient()

  const { data: evolucao } = await supabase
    .from('evolucoes_clinicas')
    .select('id, passo_protocolo')
    .eq('paciente_id', paciente_id)
    .eq('protocolo_codigo', protocolo)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!evolucao) return

  await supabase
    .from('evolucoes_clinicas')
    .update({ passo_protocolo: Math.min(5, (evolucao.passo_protocolo ?? 1) + 1) })
    .eq('id', evolucao.id)
}
