'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { useToastStore } from '@/lib/store/toast-store'
import type { AcaoPendente } from '@/lib/jornada/motor'

export type AcaoModalModo = 'executar' | 'justificar'

interface Props {
  aberto: boolean
  modo: AcaoModalModo
  acao: AcaoPendente
  pacienteId: string
  profissionalNomeDefault: string
  onFechar: () => void
  onConfirmado: () => void
}

function hojeISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function dataRelativa(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function calcIMC(pesoKg: string, alturaCm: string): string {
  const p = parseFloat(pesoKg)
  const a = parseFloat(alturaCm)
  if (!p || !a || a === 0) return ''
  return (p / ((a / 100) ** 2)).toFixed(1)
}

type TipoModal = 'prescricao' | 'classificacao' | 'exame' | 'orientacao' | 'retorno' | 'default'

const PRESCRICAO_TITULO_RE = /^(iniciar|prescrever)\s+(.+)$/i
const CLASSIFICACAO_RE = /(classificar|estadiar|est[áa]gio|grau)/i
const EXAME_RE = /(solicitar|exame|laboratorial|\bECG\b|HbA1c)/i
const ORIENTACAO_RE = /(orientar|educar|\bMEV\b|dieta|exerc[íi]cio)/i
const RETORNO_RE = /(retorno|agendar|seguimento)/i

function detectarTipoModal(acao: AcaoPendente): TipoModal {
  if (acao.tipo === 'medicacao' || PRESCRICAO_TITULO_RE.test(acao.titulo)) return 'prescricao'
  if (CLASSIFICACAO_RE.test(acao.titulo)) return 'classificacao'
  if (acao.tipo === 'exame' || EXAME_RE.test(acao.titulo)) return 'exame'
  if (ORIENTACAO_RE.test(acao.titulo)) return 'orientacao'
  if (RETORNO_RE.test(acao.titulo)) return 'retorno'
  return 'default'
}

function extrairMedicamento(titulo: string): string {
  const m = titulo.match(PRESCRICAO_TITULO_RE)
  return (m?.[2] ?? titulo).trim()
}

const FREQUENCIAS = ['1x/dia', '2x/dia', '3x/dia', '4x/dia', 'conforme necessidade'] as const
const VIAS = ['oral', 'sublingual', 'tópico', 'inalatório', 'SC', 'IM', 'IV'] as const

const CLASSIFICACOES_POR_PROTOCOLO: Record<string, readonly string[]> = {
  HAS: ['Normal', 'Normal-Alta', 'Estágio 1', 'Estágio 2', 'Estágio 3', 'Sistólica Isolada'],
  DM:  ['Pré-diabetes', 'DM tipo 2 controlado', 'DM tipo 2 não controlado', 'DM tipo 1'],
  DIS: ['Baixo risco', 'Risco intermediário', 'Alto risco', 'Muito alto risco'],
}
const CLASSIFICACAO_GENERICA = ['Leve', 'Moderado', 'Grave', 'Muito grave'] as const
const RISCOS_CV = ['Baixo', 'Moderado', 'Alto', 'Muito alto'] as const
const PROTOCOLOS_COM_RISCO_CV = new Set(['HAS', 'DM', 'DIS'])

const ORIENTACOES_OPCOES = [
  'Dieta hipossódica / DASH',
  'Atividade física ≥ 150 min/semana',
  'Cessação tabágica',
  'Restrição de álcool',
  'Redução ponderal',
  'Adesão medicamentosa reforçada',
] as const

const PRAZOS_EXAME = ['7 dias', '15 dias', '30 dias', 'outro'] as const
const PROFISSIONAIS_RETORNO = ['Médico', 'Enfermagem', 'Técnico'] as const

const HAS_CLASSIFICACOES = [
  'Normal',
  'Normal-Alta (130-139/85-89 mmHg)',
  'HAS Estágio 1 (140-159/90-99 mmHg)',
  'HAS Estágio 2 (160-179/100-109 mmHg)',
  'HAS Estágio 3 (≥ 180/110 mmHg)',
  'HAS Sistólica Isolada',
] as const

const MEV_HAS_OPCOES = [
  'Dieta hipossódica (< 5g sal/dia)',
  'Dieta DASH',
  'Atividade física ≥ 150 min/semana',
  'Cessação tabágica',
  'Restrição de álcool (< 1 dose/dia mulheres, < 2/dia homens)',
  'Redução ponderal',
] as const

const inputCls = 'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
const textareaCls = 'flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
const checkLabelCls = 'flex items-start gap-2 text-sm cursor-pointer select-none'

export function AcaoExecucaoModal(props: Props) {
  if (!props.aberto) return null
  return <AcaoExecucaoModalInner {...props} />
}

function AcaoExecucaoModalInner({
  modo, acao, pacienteId, profissionalNomeDefault, onFechar, onConfirmado,
}: Props) {
  const pushToast = useToastStore((s) => s.push)
  const ehExecutar = modo === 'executar'
  const ehHAS = ehExecutar && acao.protocolo === 'HAS'
  const tipo: TipoModal = ehHAS ? 'default' : (ehExecutar ? detectarTipoModal(acao) : 'default')
  const opcoesClassificacao = CLASSIFICACOES_POR_PROTOCOLO[acao.protocolo] ?? CLASSIFICACAO_GENERICA
  const mostrarRiscoCV = PROTOCOLOS_COM_RISCO_CV.has(acao.protocolo)

  const [dataExecucao, setDataExecucao] = useState<string>(hojeISO())
  const [observacao, setObservacao] = useState('')
  const [profissional, setProfissional] = useState(profissionalNomeDefault)
  const [motivo, setMotivo] = useState('')

  const [medicamento, setMedicamento] = useState(() =>
    tipo === 'prescricao' ? extrairMedicamento(acao.titulo) : '',
  )
  const [dose, setDose] = useState('')
  const [frequencia, setFrequencia] = useState<string>(FREQUENCIAS[0])
  const [via, setVia] = useState<string>(VIAS[0])
  const [duracao, setDuracao] = useState('')
  const [classificacao, setClassificacao] = useState<string>(opcoesClassificacao[0])
  const [riscoCV, setRiscoCV] = useState<string>(RISCOS_CV[0])
  const [valorMedida, setValorMedida] = useState('')
  const [exames, setExames] = useState<string>(() =>
    tipo === 'exame' ? acao.titulo.replace(/^solicitar\s+/i, '').trim() : '',
  )
  const [dataSolicitacao, setDataSolicitacao] = useState<string>(hojeISO())
  const [laboratorio, setLaboratorio] = useState('')
  const [prazoExame, setPrazoExame] = useState<string>(PRAZOS_EXAME[1])
  const [orientacoesSelecionadas, setOrientacoesSelecionadas] = useState<Set<string>>(() => new Set())
  const [dataRetorno, setDataRetorno] = useState<string>(dataRelativa(30))
  const [profissionalRetorno, setProfissionalRetorno] = useState<string>(PROFISSIONAIS_RETORNO[0])
  const [motivoRetorno, setMotivoRetorno] = useState('')

  // HAS Passo 1
  const [hasPaSist, setHasPaSist] = useState('')
  const [hasPaDias, setHasPaDias] = useState('')
  const [hasFc, setHasFc] = useState('')
  const [hasSpo2, setHasSpo2] = useState('')
  const [hasPeso, setHasPeso] = useState('')
  const [hasAltura, setHasAltura] = useState('')
  const [hasCircAb, setHasCircAb] = useState('')

  // HAS Passo 2
  const [hasClassif, setHasClassif] = useState<string>(HAS_CLASSIFICACOES[2])
  const [hasPrevent, setHasPrevent] = useState('')
  const [hasRiscoCvHas, setHasRiscoCvHas] = useState<string>(RISCOS_CV[1])

  // HAS Passo 3
  const [hasMevs, setHasMevs] = useState<Set<string>>(new Set())
  const [hasFarmaco, setHasFarmaco] = useState('')
  const [hasDoseFarmaco, setHasDoseFarmaco] = useState('')
  const [hasFreqFarmaco, setHasFreqFarmaco] = useState<string>(FREQUENCIAS[0])
  const [hasDataRet3, setHasDataRet3] = useState<string>(dataRelativa(30))

  // HAS Passo 4
  const [hasEcg, setHasEcg] = useState(false)
  const [hasMicroalb, setHasMicroalb] = useState(false)
  const [hasCreat, setHasCreat] = useState(false)
  const [hasDataExm, setHasDataExm] = useState<string>(hojeISO())

  // HAS Passo 5
  const [hasMeta5Sist, setHasMeta5Sist] = useState('')
  const [hasMeta5Dias, setHasMeta5Dias] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function toggleOrientacao(o: string) {
    setOrientacoesSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(o)) next.delete(o)
      else next.add(o)
      return next
    })
  }

  function toggleMev(o: string) {
    setHasMevs((prev) => {
      const next = new Set(prev)
      if (next.has(o)) next.delete(o)
      else next.add(o)
      return next
    })
  }

  function validar(): string | null {
    if (!ehExecutar) {
      if (!motivo.trim()) return 'Descreva o motivo da não execução.'
      return null
    }
    if (ehHAS) return validarHAS()
    if (!profissional.trim() && tipo !== 'retorno') return 'Informe o profissional responsável.'
    switch (tipo) {
      case 'prescricao':
        if (!medicamento.trim()) return 'Informe o medicamento.'
        if (!dose.trim()) return 'Informe a dose.'
        return null
      case 'classificacao':
        if (!classificacao.trim()) return 'Selecione a classificação.'
        return null
      case 'exame':
        if (!exames.trim()) return 'Informe ao menos um exame.'
        return null
      case 'orientacao':
        if (orientacoesSelecionadas.size === 0) return 'Selecione ao menos uma orientação.'
        return null
      case 'retorno':
        if (!dataRetorno) return 'Informe a data de retorno.'
        if (!motivoRetorno.trim()) return 'Informe o motivo do retorno.'
        return null
      default:
        return null
    }
  }

  function validarHAS(): string | null {
    switch (acao.passo) {
      case 1:
        if (!hasPaSist) return 'Informe a PA Sistólica.'
        if (!hasPaDias) return 'Informe a PA Diastólica.'
        if (!hasPeso) return 'Informe o peso do paciente.'
        if (!hasCircAb) return 'Informe a circunferência abdominal.'
        return null
      case 2:
        if (!hasClassif) return 'Selecione a classificação da HAS.'
        if (!hasPrevent) return 'Informe o escore PREVENT (%).'
        return null
      case 3:
        if (hasMevs.size === 0 && !hasFarmaco.trim()) return 'Registre ao menos uma MEV ou uma medicação iniciada.'
        if (!hasDataRet3) return 'Informe a data do próximo retorno.'
        return null
      case 4:
        if (!hasEcg && !hasMicroalb && !hasCreat) return 'Solicite ao menos um exame complementar.'
        return null
      case 5:
        if (!hasMeta5Sist) return 'Informe a PA Sistólica desta consulta.'
        if (!hasMeta5Dias) return 'Informe a PA Diastólica desta consulta.'
        return null
      default:
        return null
    }
  }

  function montarMetricas(): Record<string, unknown> {
    if (!ehExecutar) return { acao_nao_executada: acao.titulo, motivo: motivo.trim() }
    if (ehHAS) return montarMetricasHAS()
    const base: Record<string, unknown> = {
      acao_executada: acao.titulo,
      data_execucao: dataExecucao,
      profissional_responsavel: profissional.trim() || undefined,
      observacao: observacao.trim() || undefined,
    }
    switch (tipo) {
      case 'prescricao':
        return { ...base, prescricao: { medicamento: medicamento.trim(), dose: dose.trim(), frequencia, via, duracao: duracao.trim() || undefined } }
      case 'classificacao':
        return { ...base, classificacao: { estagio: classificacao, risco_cv: mostrarRiscoCV ? riscoCV : undefined, valor_medida: valorMedida.trim() || undefined } }
      case 'exame':
        return { ...base, exame_solicitado: { exames: exames.trim(), data_solicitacao: dataSolicitacao, laboratorio: laboratorio.trim() || undefined, prazo: prazoExame } }
      case 'orientacao':
        return { ...base, orientacoes: Array.from(orientacoesSelecionadas) }
      case 'retorno':
        return { ...base, retorno_agendado: { data: dataRetorno, profissional_categoria: profissionalRetorno, motivo: motivoRetorno.trim() } }
      default:
        return base
    }
  }

  function montarMetricasHAS(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      acao_executada: acao.titulo,
      data_execucao: dataExecucao,
      profissional_responsavel: profissional.trim() || undefined,
      observacao: observacao.trim() || undefined,
      protocolo: 'HAS',
      passo: acao.passo,
    }
    switch (acao.passo) {
      case 1: {
        const imc = calcIMC(hasPeso, hasAltura)
        return {
          ...base,
          pa_sistolica: Number(hasPaSist),
          pa_diastolica: Number(hasPaDias),
          fc: hasFc ? Number(hasFc) : undefined,
          spo2: hasSpo2 ? Number(hasSpo2) : undefined,
          peso: Number(hasPeso),
          altura: hasAltura ? Number(hasAltura) : undefined,
          imc: imc ? Number(imc) : undefined,
          circunferencia_abdominal: Number(hasCircAb),
        }
      }
      case 2:
        return {
          ...base,
          classificacao_has: hasClassif,
          prevent_score: Number(hasPrevent),
          risco_cv: hasRiscoCvHas,
        }
      case 3: {
        const diasRetorno = hasDataRet3
          ? Math.round((new Date(hasDataRet3).getTime() - Date.now()) / 86_400_000)
          : undefined
        return {
          ...base,
          mev_prescrita: hasMevs.size > 0,
          mev_itens: Array.from(hasMevs),
          medicacao_iniciada: !!hasFarmaco.trim(),
          medicamento: hasFarmaco.trim() || undefined,
          dose: hasDoseFarmaco.trim() || undefined,
          frequencia: hasFarmaco.trim() ? hasFreqFarmaco : undefined,
          retorno_em_dias: diasRetorno,
          data_proximo_retorno: hasDataRet3 || undefined,
        }
      }
      case 4:
        return { ...base, ecg_solicitado: hasEcg, microalbuminuria_solicitada: hasMicroalb, creatinina_solicitada: hasCreat }
      case 5:
        return { ...base, pa_sistolica: Number(hasMeta5Sist), pa_diastolica: Number(hasMeta5Dias) }
      default:
        return base
    }
  }

  async function persistirSideEffects() {
    if (IS_DEMO_MODE) return
    if (!ehExecutar) return
    const supabase = createClient()

    if (ehHAS && acao.passo === 4) {
      const examesLOA: string[] = []
      if (hasEcg) examesLOA.push('ECG')
      if (hasMicroalb) examesLOA.push('Microalbuminúria')
      if (hasCreat) examesLOA.push('Creatinina e TFG')
      if (examesLOA.length > 0) {
        const rows = examesLOA.map((nome) => ({ paciente_id: pacienteId, nome_exame: nome, data_coleta: hasDataExm, status: 'pendente' as const }))
        const { error } = await supabase.from('exames_resultados').insert(rows)
        if (error) throw error
      }
      return
    }

    if (ehHAS && acao.passo === 3 && hasDataRet3) {
      const dataHora = new Date(`${hasDataRet3}T09:00:00`).toISOString()
      await supabase.from('agendamentos').insert({
        paciente_id: pacienteId,
        profissional_id: null,
        data_hora: dataHora,
        tipo: 'retorno',
        protocolos_previstos: [acao.protocolo],
        status: 'agendado',
      })
      return
    }

    if (tipo === 'exame') {
      const linhas = exames.split('\n').map((s) => s.trim()).filter(Boolean)
      if (linhas.length === 0) return
      const rows = linhas.map((nome) => ({ paciente_id: pacienteId, nome_exame: nome, data_coleta: dataSolicitacao, status: 'pendente' as const }))
      const { error } = await supabase.from('exames_resultados').insert(rows)
      if (error) throw error
    }

    if (tipo === 'retorno') {
      const dataHora = new Date(`${dataRetorno}T09:00:00`).toISOString()
      const { error } = await supabase.from('agendamentos').insert({
        paciente_id: pacienteId,
        profissional_id: null,
        data_hora: dataHora,
        tipo: 'retorno',
        protocolos_previstos: [acao.protocolo],
        status: 'agendado',
      })
      if (error) throw error
    }
  }

  async function confirmar() {
    setErro(null)
    const erroValidacao = validar()
    if (erroValidacao) { setErro(erroValidacao); return }
    setSalvando(true)
    try {
      const metricas = montarMetricas()
      if (!IS_DEMO_MODE) {
        const supabase = createClient()
        const { error } = await supabase.from('evolucoes_clinicas').insert({
          paciente_id: pacienteId,
          consulta_id: null,
          protocolo_codigo: acao.protocolo,
          passo_protocolo: acao.passo,
          metricas: { ...metricas, origem: 'acao_jornada', tipo_modal: ehHAS ? `HAS_passo${acao.passo}` : tipo },
        })
        if (error) throw error
        await persistirSideEffects()
      }
      pushToast({ tipo: 'sucesso', titulo: tituloToastSucesso(tipo, ehExecutar, ehHAS, acao.passo), descricao: acao.titulo })
      onConfirmado()
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar ação')
    } finally {
      setSalvando(false)
    }
  }

  const cabecalho = cabecalhoModal(tipo, ehExecutar, ehHAS, acao.passo)
  const imcCalculado = calcIMC(hasPeso, hasAltura)

  return (
    <Dialog open onOpenChange={(open) => !open && !salvando && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{cabecalho.icone}</span>
            {cabecalho.titulo}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {acao.titulo}
            {acao.bloqueante && (
              <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">BLOQUEANTE</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {!ehExecutar && (
            <div className="space-y-1.5">
              <Label htmlFor="acao-motivo">Motivo da não execução</Label>
              <textarea id="acao-motivo" rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: paciente recusou medicação, contraindicação clínica…"
                className={textareaCls} />
              <p className="text-[11px] text-slate-400">A justificativa fica registrada no histórico e libera o motor para reavaliar a etapa.</p>
            </div>
          )}

          {/* HAS Passo 1 — Triagem e Medidas */}
          {ehHAS && acao.passo === 1 && (
            <div className="rounded-md border border-red-100 bg-red-50 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">HAS — Passo 1: Triagem e Medidas</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="has1-sist">PA Sistólica (mmHg) *</Label>
                  <input id="has1-sist" type="number" min={60} max={300} value={hasPaSist} onChange={(e) => setHasPaSist(e.target.value)} placeholder="Ex.: 160" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has1-dias">PA Diastólica (mmHg) *</Label>
                  <input id="has1-dias" type="number" min={40} max={200} value={hasPaDias} onChange={(e) => setHasPaDias(e.target.value)} placeholder="Ex.: 100" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has1-fc">FC (bpm)</Label>
                  <input id="has1-fc" type="number" min={30} max={250} value={hasFc} onChange={(e) => setHasFc(e.target.value)} placeholder="Ex.: 78" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has1-spo2">SpO₂ (%)</Label>
                  <input id="has1-spo2" type="number" min={70} max={100} value={hasSpo2} onChange={(e) => setHasSpo2(e.target.value)} placeholder="Ex.: 98" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has1-peso">Peso (kg) *</Label>
                  <input id="has1-peso" type="number" step="0.1" min={20} max={400} value={hasPeso} onChange={(e) => setHasPeso(e.target.value)} placeholder="Ex.: 82.5" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has1-alt">Altura (cm)</Label>
                  <input id="has1-alt" type="number" min={100} max={250} value={hasAltura} onChange={(e) => setHasAltura(e.target.value)} placeholder="Ex.: 170" className={inputCls} />
                </div>
              </div>
              {imcCalculado && (
                <p className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                  IMC calculado: <strong>{imcCalculado} kg/m²</strong>
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="has1-circ">Circunferência Abdominal (cm) *</Label>
                <input id="has1-circ" type="number" step="0.5" min={50} max={200} value={hasCircAb} onChange={(e) => setHasCircAb(e.target.value)} placeholder="Ex.: 98" className={inputCls} />
                <p className="text-[10px] text-slate-400">Meta: &lt; 88 cm mulheres · &lt; 102 cm homens</p>
              </div>
            </div>
          )}

          {/* HAS Passo 2 — Classificação e Risco CV */}
          {ehHAS && acao.passo === 2 && (
            <div className="rounded-md border border-violet-100 bg-violet-50 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">HAS — Passo 2: Classificação e Risco CV</p>
              <div className="space-y-1.5">
                <Label htmlFor="has2-classif">Classificação da HAS *</Label>
                <select id="has2-classif" value={hasClassif} onChange={(e) => setHasClassif(e.target.value)} className={inputCls}>
                  {HAS_CLASSIFICACOES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="has2-prevent">Escore PREVENT (%) *</Label>
                  <input id="has2-prevent" type="number" step="0.1" min={0} max={100} value={hasPrevent} onChange={(e) => setHasPrevent(e.target.value)} placeholder="Ex.: 12.5" className={inputCls} />
                  <p className="text-[10px] text-slate-400">AHA — PREVENT Calculator</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has2-risco">Risco Cardiovascular</Label>
                  <select id="has2-risco" value={hasRiscoCvHas} onChange={(e) => setHasRiscoCvHas(e.target.value)} className={inputCls}>
                    {RISCOS_CV.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* HAS Passo 3 — Plano Terapêutico */}
          {ehHAS && acao.passo === 3 && (
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-4 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">HAS — Passo 3: Plano Terapêutico</p>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-emerald-800">Medidas de Estilo de Vida (MEV)</p>
                {MEV_HAS_OPCOES.map((o) => (
                  <label key={o} className={checkLabelCls}>
                    <input type="checkbox" className="mt-0.5 accent-emerald-600" checked={hasMevs.has(o)} onChange={() => toggleMev(o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
              <div className="border-t border-emerald-200 pt-3 space-y-3">
                <p className="text-xs font-semibold text-emerald-800">Farmacoterapia (se indicada)</p>
                <div className="space-y-1.5">
                  <Label htmlFor="has3-med">Medicamento</Label>
                  <input id="has3-med" type="text" value={hasFarmaco} onChange={(e) => setHasFarmaco(e.target.value)} placeholder="Ex.: Losartana 50mg" className={inputCls} />
                </div>
                {hasFarmaco.trim() && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="has3-dose">Dose</Label>
                      <input id="has3-dose" type="text" value={hasDoseFarmaco} onChange={(e) => setHasDoseFarmaco(e.target.value)} placeholder="Ex.: 50mg" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="has3-freq">Frequência</Label>
                      <select id="has3-freq" value={hasFreqFarmaco} onChange={(e) => setHasFreqFarmaco(e.target.value)} className={inputCls}>
                        {FREQUENCIAS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-emerald-200 pt-3 space-y-1.5">
                <Label htmlFor="has3-retorno">Data do próximo retorno *</Label>
                <input id="has3-retorno" type="date" value={hasDataRet3} onChange={(e) => setHasDataRet3(e.target.value)} min={hojeISO()} className={inputCls} />
                <p className="text-[10px] text-slate-400">Protocolo HAS: 30 dias se apenas MEV · 15 dias se farmacoterapia iniciada</p>
              </div>
            </div>
          )}

          {/* HAS Passo 4 — Exames LOA */}
          {ehHAS && acao.passo === 4 && (
            <div className="rounded-md border border-cyan-100 bg-cyan-50 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">HAS — Passo 4: Exames Complementares (LOA)</p>
              <p className="text-xs text-slate-600">Solicite os exames para avaliação de lesão de órgão-alvo:</p>
              <div className="space-y-3">
                <label className={checkLabelCls}>
                  <input type="checkbox" className="mt-0.5 accent-cyan-600" checked={hasEcg} onChange={(e) => setHasEcg(e.target.checked)} />
                  <div>
                    <span className="font-medium">ECG (Eletrocardiograma)</span>
                    <p className="text-[10px] text-slate-400">Avaliação de HVE e distúrbios de condução</p>
                  </div>
                </label>
                <label className={checkLabelCls}>
                  <input type="checkbox" className="mt-0.5 accent-cyan-600" checked={hasMicroalb} onChange={(e) => setHasMicroalb(e.target.checked)} />
                  <div>
                    <span className="font-medium">Microalbuminúria</span>
                    <p className="text-[10px] text-slate-400">Avaliação de nefropatia hipertensiva</p>
                  </div>
                </label>
                <label className={checkLabelCls}>
                  <input type="checkbox" className="mt-0.5 accent-cyan-600" checked={hasCreat} onChange={(e) => setHasCreat(e.target.checked)} />
                  <div>
                    <span className="font-medium">Creatinina sérica + TFG</span>
                    <p className="text-[10px] text-slate-400">Avaliação de função renal</p>
                  </div>
                </label>
              </div>
              <div className="space-y-1.5 border-t border-cyan-200 pt-3">
                <Label htmlFor="has4-data">Data de solicitação</Label>
                <input id="has4-data" type="date" value={hasDataExm} onChange={(e) => setHasDataExm(e.target.value)} max={hojeISO()} className={inputCls} />
              </div>
            </div>
          )}

          {/* HAS Passo 5 — Meta PA */}
          {ehHAS && acao.passo === 5 && (
            <div className="rounded-md border border-green-100 bg-green-50 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">HAS — Passo 5: Aferição de Meta Pressórica</p>
              <div className="rounded bg-green-100 px-3 py-2 text-xs text-green-800">
                <strong>Meta HAS:</strong> PA &lt; 130/80 mmHg em 2 consultas consecutivas. O sistema verificará automaticamente.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="has5-sist">PA Sistólica (mmHg) *</Label>
                  <input id="has5-sist" type="number" min={60} max={300} value={hasMeta5Sist} onChange={(e) => setHasMeta5Sist(e.target.value)} placeholder="Ex.: 126" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="has5-dias">PA Diastólica (mmHg) *</Label>
                  <input id="has5-dias" type="number" min={40} max={200} value={hasMeta5Dias} onChange={(e) => setHasMeta5Dias(e.target.value)} placeholder="Ex.: 78" className={inputCls} />
                </div>
              </div>
              {hasMeta5Sist && hasMeta5Dias && (
                Number(hasMeta5Sist) < 130 && Number(hasMeta5Dias) < 80 ? (
                  <p className="rounded bg-green-200 px-2 py-1 text-xs font-medium text-green-900">
                    ✓ PA dentro da meta (&lt; 130/80 mmHg)
                  </p>
                ) : (
                  <p className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                    PA ainda acima da meta. Registro será salvo para acompanhamento.
                  </p>
                )
              )}
            </div>
          )}

          {/* Formulários genéricos (não-HAS) */}
          {!ehHAS && ehExecutar && tipo === 'prescricao' && (
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Prescrição</p>
              <div className="space-y-1.5">
                <Label htmlFor="rx-medicamento">Medicamento</Label>
                <input id="rx-medicamento" type="text" value={medicamento} onChange={(e) => setMedicamento(e.target.value)} placeholder="Ex.: Metformina" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rx-dose">Dose</Label>
                  <input id="rx-dose" type="text" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Ex.: 500mg" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rx-frequencia">Frequência</Label>
                  <select id="rx-frequencia" value={frequencia} onChange={(e) => setFrequencia(e.target.value)} className={inputCls}>
                    {FREQUENCIAS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rx-via">Via</Label>
                  <select id="rx-via" value={via} onChange={(e) => setVia(e.target.value)} className={inputCls}>
                    {VIAS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rx-duracao">Duração</Label>
                  <input id="rx-duracao" type="text" value={duracao} onChange={(e) => setDuracao(e.target.value)} placeholder='Ex.: "30 dias", "uso contínuo"' className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {!ehHAS && ehExecutar && tipo === 'classificacao' && (
            <div className="rounded-md border border-violet-100 bg-violet-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Classificação / Estadiamento ({acao.protocolo})</p>
              <div className="space-y-1.5">
                <Label htmlFor="cl-estagio">Classificação / Estágio</Label>
                <select id="cl-estagio" value={classificacao} onChange={(e) => setClassificacao(e.target.value)} className={inputCls}>
                  {opcoesClassificacao.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {mostrarRiscoCV && (
                <div className="space-y-1.5">
                  <Label htmlFor="cl-risco">Risco cardiovascular</Label>
                  <select id="cl-risco" value={riscoCV} onChange={(e) => setRiscoCV(e.target.value)} className={inputCls}>
                    {RISCOS_CV.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="cl-valor">Valor da medida</Label>
                <input id="cl-valor" type="text" value={valorMedida} onChange={(e) => setValorMedida(e.target.value)} placeholder="Ex.: PA 160/100 mmHg, HbA1c 8.5%" className={inputCls} />
              </div>
            </div>
          )}

          {!ehHAS && ehExecutar && tipo === 'exame' && (
            <div className="rounded-md border border-cyan-100 bg-cyan-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Exame solicitado</p>
              <div className="space-y-1.5">
                <Label htmlFor="ex-nome">Exame(s) solicitado(s)</Label>
                <textarea id="ex-nome" rows={3} value={exames} onChange={(e) => setExames(e.target.value)} placeholder="Um exame por linha — ex.: HbA1c, Perfil lipídico" className={textareaCls} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ex-data">Data de solicitação</Label>
                  <input id="ex-data" type="date" value={dataSolicitacao} onChange={(e) => setDataSolicitacao(e.target.value)} className={inputCls} max={hojeISO()} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-prazo">Prazo para resultado</Label>
                  <select id="ex-prazo" value={prazoExame} onChange={(e) => setPrazoExame(e.target.value)} className={inputCls}>
                    {PRAZOS_EXAME.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-lab">Laboratório / Local</Label>
                <input id="ex-lab" type="text" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} placeholder="Ex.: Lab. Empresa, Unidade Central" className={inputCls} />
              </div>
            </div>
          )}

          {!ehHAS && ehExecutar && tipo === 'orientacao' && (
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Orientações dadas ao paciente</p>
              <div className="space-y-1.5">
                {ORIENTACOES_OPCOES.map((o) => (
                  <label key={o} className={checkLabelCls}>
                    <input type="checkbox" className="mt-0.5" checked={orientacoesSelecionadas.has(o)} onChange={() => toggleOrientacao(o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!ehHAS && ehExecutar && tipo === 'retorno' && (
            <div className="rounded-md border border-indigo-100 bg-indigo-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Agendamento de retorno</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rt-data">Data do próximo retorno</Label>
                  <input id="rt-data" type="date" value={dataRetorno} onChange={(e) => setDataRetorno(e.target.value)} className={inputCls} min={hojeISO()} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rt-prof">Profissional responsável</Label>
                  <select id="rt-prof" value={profissionalRetorno} onChange={(e) => setProfissionalRetorno(e.target.value)} className={inputCls}>
                    {PROFISSIONAIS_RETORNO.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rt-motivo">Motivo do retorno</Label>
                <input id="rt-motivo" type="text" value={motivoRetorno} onChange={(e) => setMotivoRetorno(e.target.value)} placeholder="Ex.: reavaliar PA pós-ajuste, revisar exames" className={inputCls} />
              </div>
            </div>
          )}

          {ehExecutar && !ehHAS && tipo !== 'retorno' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="acao-data">Data de execução</Label>
                <input id="acao-data" type="date" value={dataExecucao} onChange={(e) => setDataExecucao(e.target.value)} className={inputCls} max={hojeISO()} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acao-prof">Profissional responsável</Label>
                <input id="acao-prof" type="text" value={profissional} onChange={(e) => setProfissional(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acao-obs">Observações</Label>
                <textarea id="acao-obs" rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações clínicas adicionais…" className={textareaCls} />
              </div>
            </>
          )}

          {erro && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button
            onClick={confirmar}
            disabled={salvando}
            className={ehExecutar ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}
          >
            {salvando ? 'Salvando…' : cabecalho.cta}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Texto contextual ─────────────────────────────────────────────────────────

function cabecalhoModal(
  tipo: TipoModal,
  ehExecutar: boolean,
  ehHAS: boolean,
  passo: number,
): { icone: string; titulo: string; cta: string } {
  if (!ehExecutar) return { icone: '⚠️', titulo: 'Justificar não execução', cta: 'Registrar justificativa' }
  if (ehHAS) {
    const t: Record<number, { icone: string; titulo: string; cta: string }> = {
      1: { icone: '📊', titulo: 'HAS — Triagem e Medidas', cta: 'Salvar medidas' },
      2: { icone: '🏷️', titulo: 'HAS — Classificação e Risco CV', cta: 'Confirmar classificação' },
      3: { icone: '💊', titulo: 'HAS — Plano Terapêutico', cta: 'Confirmar tratamento' },
      4: { icone: '🧪', titulo: 'HAS — Exames Complementares', cta: 'Confirmar solicitação' },
      5: { icone: '🎯', titulo: 'HAS — Aferição de Meta PA', cta: 'Registrar PA' },
    }
    return t[passo] ?? { icone: '✅', titulo: 'HAS — Registrar', cta: 'Confirmar' }
  }
  switch (tipo) {
    case 'prescricao':   return { icone: '💊', titulo: 'Registrar prescrição', cta: 'Confirmar prescrição' }
    case 'classificacao':return { icone: '🏷️', titulo: 'Registrar classificação', cta: 'Confirmar classificação' }
    case 'exame':        return { icone: '🧪', titulo: 'Solicitar exame', cta: 'Confirmar solicitação' }
    case 'orientacao':   return { icone: '📚', titulo: 'Registrar orientações', cta: 'Confirmar orientações' }
    case 'retorno':      return { icone: '📅', titulo: 'Agendar retorno', cta: 'Confirmar agendamento' }
    default:             return { icone: '✅', titulo: 'Registrar execução', cta: 'Confirmar execução' }
  }
}

function tituloToastSucesso(tipo: TipoModal, ehExecutar: boolean, ehHAS: boolean, passo: number): string {
  if (!ehExecutar) return 'Não execução justificada'
  if (ehHAS) {
    const t: Record<number, string> = {
      1: 'Medidas registradas',
      2: 'Classificação HAS registrada',
      3: 'Plano terapêutico registrado',
      4: 'Exames solicitados',
      5: 'PA registrada',
    }
    return t[passo] ?? 'Etapa HAS registrada'
  }
  switch (tipo) {
    case 'prescricao':   return 'Prescrição registrada'
    case 'classificacao':return 'Classificação registrada'
    case 'exame':        return 'Exame solicitado'
    case 'orientacao':   return 'Orientações registradas'
    case 'retorno':      return 'Retorno agendado'
    default:             return 'Ação registrada com sucesso'
  }
}
