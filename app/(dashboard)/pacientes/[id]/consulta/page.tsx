'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { demoPacientes, demoLinhas, demoConsultas, demoExames, calcularIdade, demoProfissional } from '@/lib/demo-data'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { calcularJornada, type StatusJornada } from '@/lib/jornada/motor'
import { gerarProximasAcoes, urgenciaBadge, contatoIcon, type ProximaAcao } from '@/lib/jornada/proximas-acoes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusPill } from '@/components/shared/StatusPill'
import { cn } from '@/lib/utils'
import type { StatusControle } from '@/types'

// ── Vitais ───────────────────────────────────────────────────
interface Vitais {
  pa1_s: string; pa1_d: string
  pa2_s: string; pa2_d: string
  fc: string; spo2: string; temp: string
  peso: string; altura: string
  ca: string; glicemia: string
}

// ── Métricas por protocolo ────────────────────────────────────
type MetricasMap = Record<string, Record<string, string | boolean>>

function calcIMC(peso: string, altura: string): string {
  const p = parseFloat(peso); const h = parseFloat(altura)
  if (!p || !h) return '—'
  return (p / (h * h)).toFixed(1)
}

function alertaPA(s: string, d: string) {
  const sv = parseInt(s); const dv = parseInt(d)
  if (!sv || !dv) return null
  if (sv >= 160 || dv >= 100) return 'critico'
  if (sv >= 140 || dv >= 90) return 'atencao'
  return null
}

function alertaGlicemia(g: string) {
  const v = parseFloat(g)
  if (!v) return null
  if (v > 300) return 'critico'
  if (v > 180) return 'atencao'
  return null
}

// ── Campos específicos por protocolo ─────────────────────────
function CamposProtocolo({
  codigo, metricas, setMetrica
}: {
  codigo: string
  metricas: Record<string, string | boolean>
  setMetrica: (k: string, v: string | boolean) => void
}) {
  const s = (k: string) => (metricas[k] as string) ?? ''
  const b = (k: string) => (metricas[k] as boolean) ?? false
  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} placeholder={placeholder} value={s(key)} onChange={e => setMetrica(key, e.target.value)} className="mt-1 h-8 text-sm" />
    </div>
  )

  switch (codigo) {
    case 'HAS': return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Classificação PA</Label>
          <select value={s('classificacao')} onChange={e => setMetrica('classificacao', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">Selecione</option>
            <option value="normal">Normal</option>
            <option value="elevada">PA Elevada</option>
            <option value="has1">HAS Grau 1</option>
            <option value="has2">HAS Grau 2</option>
            <option value="has3">HAS Grau 3</option>
          </select>
        </div>
        {field('Medicação atual', 'medicacao', 'text', 'Ex: Losartana 50mg')}
        <div>
          <Label className="text-xs">Adesão medicamentosa</Label>
          <select value={s('adesao')} onChange={e => setMetrica('adesao', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">Selecione</option>
            <option value="boa">Boa (&gt;80%)</option>
            <option value="parcial">Parcial (50–80%)</option>
            <option value="ruim">Ruim (&lt;50%)</option>
          </select>
        </div>
        {field('Conduta', 'conduta', 'text', 'Ex: Manter Losartana, ajustar dose')}
      </div>
    )

    case 'DM': return (
      <div className="grid grid-cols-2 gap-3">
        {field('HbA1c mais recente (%)', 'hba1c', 'number', '7.0')}
        <div>
          <Label className="text-xs">Pé diabético avaliado</Label>
          <select value={s('pe_avaliado')} onChange={e => setMetrica('pe_avaliado', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="normal">Avaliado — sem alteração</option>
            <option value="alterado">Avaliado — com alteração</option>
            <option value="nao">Não avaliado nesta consulta</option>
          </select>
        </div>
        {field('Medicação atual', 'medicacao', 'text', 'Ex: Metformina 850mg')}
        {field('Conduta', 'conduta', 'text', 'Ex: Escalonar para iSGLT2')}
      </div>
    )

    case 'TAB': return (
      <div className="grid grid-cols-2 gap-3">
        {field('Fagerström (0–10)', 'fagerstrom', 'number', '5')}
        <div>
          <Label className="text-xs">Status cessação</Label>
          <select value={s('status_cessacao')} onChange={e => setMetrica('status_cessacao', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="em_tratamento">Em tratamento</option>
            <option value="cessacao">Em cessação</option>
            <option value="recaida">Recaída</option>
            <option value="sucesso">Sucesso ≥6 meses</option>
          </select>
        </div>
        {field('Dias sem fumar', 'dias_sem_fumar', 'number', '0')}
        {field('Terapia em uso', 'terapia', 'text', 'TRN, Bupropiona, Vareniclina')}
      </div>
    )

    case 'SM': return (
      <div className="grid grid-cols-2 gap-3">
        {field('PHQ-9 score (0–27)', 'phq9', 'number', '9')}
        {field('Medicação atual', 'medicacao', 'text', 'Sertralina 50mg')}
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('tcc_andamento')} onCheckedChange={v => setMetrica('tcc_andamento', !!v)} />
          <Label className="text-xs">TCC em andamento</Label>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('ideacao_suicida')} onCheckedChange={v => setMetrica('ideacao_suicida', !!v)} />
          <Label className="text-xs font-semibold text-red-600">Ideação suicida presente</Label>
        </div>
      </div>
    )

    case 'TAG': return (
      <div className="grid grid-cols-2 gap-3">
        {field('GAD-7 score (0–21)', 'gad7', 'number', '7')}
        {field('Medicação atual', 'medicacao', 'text', 'Escitalopram 10mg')}
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('tcc_andamento')} onCheckedChange={v => setMetrica('tcc_andamento', !!v)} />
          <Label className="text-xs">TCC em andamento</Label>
        </div>
      </div>
    )

    case 'CEF': return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Tipo de cefaleia</Label>
          <select value={s('tipo')} onChange={e => setMetrica('tipo', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="migrânea">Enxaqueca / Migrânea</option>
            <option value="tensional">Cefaleia tensional</option>
            <option value="cluster">Cefaleia em salvas</option>
            <option value="outra">Outra</option>
          </select>
        </div>
        {field('Frequência (crises/mês)', 'frequencia_mes', 'number', '4')}
        {field('EVA da última crise (0–10)', 'eva', 'number', '7')}
        {field('Profilaxia em uso', 'profilaxia', 'text', 'Propranolol 40mg')}
      </div>
    )

    case 'GOT': return (
      <div className="grid grid-cols-2 gap-3">
        {field('Ácido úrico (mg/dL)', 'acido_urico', 'number', '7.2')}
        {field('Dose alopurinol (mg/dia)', 'alopurinol_dose', 'number', '300')}
        {field('Dias sem crise', 'dias_sem_crise', 'number', '90')}
      </div>
    )

    case 'ALC': return (
      <div className="grid grid-cols-2 gap-3">
        {field('Score AUDIT (0–40)', 'audit', 'number', '12')}
        {field('Dias de abstinência', 'dias_abstinencia', 'number', '0')}
        {field('Farmacoterapia', 'farmacoterapia', 'text', 'Naltrexona 50mg, Tiamina')}
      </div>
    )

    case 'ASM': return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Controle GINA</Label>
          <select value={s('gina')} onChange={e => setMetrica('gina', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="bem_controlada">Bem controlada</option>
            <option value="parcialmente">Parcialmente controlada</option>
            <option value="nao_controlada">Não controlada</option>
          </select>
        </div>
        {field('PFE (%)', 'pfe_pct', 'number', '80')}
        {field('Exacerbações/ano', 'exacerbacoes_ano', 'number', '1')}
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('tecnica_correta')} onCheckedChange={v => setMetrica('tecnica_correta', !!v)} />
          <Label className="text-xs">Técnica inalatória correta</Label>
        </div>
      </div>
    )

    case 'SAO': return (
      <div className="grid grid-cols-2 gap-3">
        {field('Score STOP-BANG (0–8)', 'stop_bang', 'number', '5')}
        {field('IAH (eventos/hora)', 'iah', 'number', '24')}
        {field('Horas CPAP/noite', 'horas_cpap', 'number', '4')}
        {field('Noites de uso (%)', 'noites_pct', 'number', '70')}
      </div>
    )

    case 'DPC': return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Grupo GOLD-ABE</Label>
          <select value={s('gold_grupo')} onChange={e => setMetrica('gold_grupo', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="E">E</option>
          </select>
        </div>
        {field('CAT score (0–40)', 'cat', 'number', '15')}
        {field('Eosinófilos (células/µL)', 'eosinofilos', 'number', '300')}
        {field('Exacerbações/ano', 'exacerbacoes_ano', 'number', '1')}
      </div>
    )

    case 'SME': return (
      <div className="grid grid-cols-2 gap-3">
        {field('Nº critérios SM presentes (0–5)', 'criterios_presentes', 'number', '3')}
        {field('Circunferência abdominal (cm)', 'ca', 'number', '95')}
        {field('Triglicerídeos (mg/dL)', 'tg', 'number', '180')}
        {field('HDL (mg/dL)', 'hdl', 'number', '38')}
      </div>
    )

    case 'HIP': return (
      <div className="grid grid-cols-2 gap-3">
        {field('TSH atual (mUI/L)', 'tsh', 'number', '2.5')}
        {field('Dose levotiroxina (mcg/dia)', 'dose_levotiroxina', 'number', '75')}
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('meta_atingida')} onCheckedChange={v => setMetrica('meta_atingida', !!v)} />
          <Label className="text-xs">Meta TSH 0,5–2,5 atingida</Label>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('jejum_correto')} onCheckedChange={v => setMetrica('jejum_correto', !!v)} />
          <Label className="text-xs">Tomando em jejum 30–60 min</Label>
        </div>
      </div>
    )

    case 'CHK': return (
      <div className="grid grid-cols-2 gap-3">
        {['DNA-HPV realizado', 'Mamografia em dia', 'FIT em dia', 'Influenza 2026', 'COVID atualizado', 'dTpa em dia', 'PCV20 aplicada'].map(item => (
          <div key={item} className="flex items-center gap-2">
            <Checkbox checked={b(item)} onCheckedChange={v => setMetrica(item, !!v)} />
            <Label className="text-xs">{item}</Label>
          </div>
        ))}
      </div>
    )

    case 'HOM': return (
      <div className="grid grid-cols-2 gap-3">
        {field('PSA (ng/mL)', 'psa', 'number', '')}
        {field('Testosterona total (ng/dL)', 'testosterona', 'number', '')}
        {field('IIEF-5 score (5–25)', 'iief5', 'number', '')}
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('sildenafila')} onCheckedChange={v => setMetrica('sildenafila', !!v)} />
          <Label className="text-xs">Sildenafila prescrita</Label>
        </div>
      </div>
    )

    case 'MUL': return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">DNA-HPV / Papanicolau</Label>
          <select value={s('dna_hpv')} onChange={e => setMetrica('dna_hpv', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="em_dia">Em dia</option>
            <option value="pendente">Pendente</option>
            <option value="alterado">Resultado alterado</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Mamografia</Label>
          <select value={s('mamografia')} onChange={e => setMetrica('mamografia', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="em_dia">Em dia</option>
            <option value="pendente">Pendente</option>
            <option value="alterado">BI-RADS 4/5</option>
          </select>
        </div>
        {field('Contracepção atual', 'contraceptivo', 'text', 'ACO combinado, DIU…')}
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('rastreio_violencia')} onCheckedChange={v => setMetrica('rastreio_violencia', !!v)} />
          <Label className="text-xs">Rastreio de violência realizado</Label>
        </div>
      </div>
    )

    case 'LOM': return (
      <div className="grid grid-cols-2 gap-3">
        {field('EVA da dor (0–10)', 'eva', 'number', '6')}
        {field('Localização', 'localizacao', 'text', 'Lombar baixa')}
        {['Déficit neurológico', 'Febre / Perda de peso', 'Histórico de câncer', 'Trauma recente', 'Síndrome cauda equina'].map(rf => (
          <div key={rf} className="flex items-center gap-2">
            <Checkbox checked={b(rf)} onCheckedChange={v => setMetrica(rf, !!v)} />
            <Label className="text-xs text-red-600">⚠ {rf}</Label>
          </div>
        ))}
      </div>
    )

    case 'DRM': return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Tipo de dermatose</Label>
          <select value={s('tipo')} onChange={e => setMetrica('tipo', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">—</option>
            <option value="DCI">DCI — Irritativa</option>
            <option value="DCA">DCA — Alérgica</option>
          </select>
        </div>
        {field('Agente suspeito', 'agente', 'text', 'Lubrificante, solvente…')}
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('sinan_notificado')} onCheckedChange={v => setMetrica('sinan_notificado', !!v)} />
          <Label className="text-xs font-semibold">Notificação SINAN realizada</Label>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('epi_correto')} onCheckedChange={v => setMetrica('epi_correto', !!v)} />
          <Label className="text-xs">EPI correto em uso (luvas nitrila)</Label>
        </div>
      </div>
    )

    case 'OBE': return (
      <div className="grid grid-cols-2 gap-3">
        {field('Peso meta (kg)', 'peso_meta', 'number', '')}
        {field('Perda de peso acumulada (kg)', 'perda_kg', 'number', '')}
        <div>
          <Label className="text-xs">Farmacoterapia</Label>
          <select value={s('farmaco')} onChange={e => setMetrica('farmaco', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">Nenhuma</option>
            <option value="semaglutida">Semaglutida</option>
            <option value="liraglutida">Liraglutida</option>
            <option value="orlistate">Orlistate</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Checkbox checked={b('biatrica_avaliada')} onCheckedChange={v => setMetrica('biatrica_avaliada', !!v)} />
          <Label className="text-xs">Cirurgia bariátrica avaliada</Label>
        </div>
      </div>
    )

    case 'DIS': return (
      <div className="grid grid-cols-2 gap-3">
        {field('LDL (mg/dL)', 'ldl', 'number', '120')}
        {field('HDL (mg/dL)', 'hdl', 'number', '45')}
        {field('TG (mg/dL)', 'tg', 'number', '150')}
        {field('Medicação atual', 'medicacao', 'text', 'Rosuvastatina 20mg')}
      </div>
    )

    default: return (
      <p className="text-sm text-slate-400">Campos específicos em desenvolvimento.</p>
    )
  }
}

// ── Resumo pós-consulta ───────────────────────────────────────

interface ResumoAvanco {
  protocolo: string
  de: number
  para: number
  titulo_novo: string
}

interface ResumoData {
  jornadas: StatusJornada[]
  avancos: ResumoAvanco[]
  retorno_data: Date
  exames_solicitados: string[]
  proximas_acoes: ProximaAcao[]
}

function ResumoJornada({
  pacienteNome, pacienteId, resumo,
}: {
  pacienteNome: string
  pacienteId: string
  resumo: ResumoData
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 py-4">
      {/* Header */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-slate-800">Consulta finalizada!</h2>
        <p className="text-slate-500 mt-1 text-sm">{pacienteNome} · {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Avanços de passo */}
      {resumo.avancos.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
          <h3 className="font-semibold text-blue-800 text-sm">🏆 Passos avançados automaticamente</h3>
          {resumo.avancos.map((av, i) => {
            const proto = PROTOCOLO_MAP.get(av.protocolo)
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: proto?.cor ?? '#6b7280' }}>
                  {av.protocolo}
                </span>
                <span className="text-slate-600">Passo {av.de} → <span className="font-bold text-blue-700">Passo {av.para}</span></span>
                <span className="text-slate-400">— {av.titulo_novo}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Critérios pendentes por protocolo */}
      {resumo.jornadas.some(j => j.acoes_pendentes.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <h3 className="font-semibold text-amber-800 text-sm">⚠️ Critérios pendentes nesta consulta</h3>
          {resumo.jornadas.filter(j => j.acoes_pendentes.length > 0).map((j, i) => {
            const proto = PROTOCOLO_MAP.get(j.protocolo)
            return (
              <div key={i}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: proto?.cor ?? '#6b7280' }}>
                    {j.protocolo}
                  </span>
                  <span className="text-xs text-amber-700 font-medium">Passo {j.passo_atual} — {j.titulo_passo}</span>
                </div>
                <ul className="space-y-1 ml-1">
                  {j.acoes_pendentes.slice(0, 3).map((a, ai) => (
                    <li key={ai} className="flex items-start gap-1.5 text-xs text-amber-700">
                      <span className="mt-0.5 shrink-0">{a.bloqueante ? '🔴' : '🟡'}</span>
                      {a.titulo}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* Retorno + exames */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 text-sm mb-2">📅 Próximo Retorno</h3>
          <p className="text-2xl font-bold text-blue-600">
            {resumo.retorno_data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {resumo.retorno_data.toLocaleDateString('pt-BR', { weekday: 'long' })} · em{' '}
            {Math.round((resumo.retorno_data.getTime() - Date.now()) / 86400000)} dias
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 text-sm mb-2">🧪 Exames Solicitados</h3>
          {resumo.exames_solicitados.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum exame solicitado nesta consulta.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {resumo.exames_solicitados.map(e => (
                <span key={e} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{e}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Próximas ações */}
      {resumo.proximas_acoes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">🎯 Próximas Ações Prioritárias</h3>
          <div className="space-y-2">
            {resumo.proximas_acoes.map((acao, i) => {
              const badge = urgenciaBadge(acao.urgencia)
              const proto = PROTOCOLO_MAP.get(acao.protocolo)
              return (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-base shrink-0">{contatoIcon(acao.tipo_contato)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex rounded px-1 py-0.5 text-[9px] font-bold text-white"
                        style={{ backgroundColor: proto?.cor ?? '#6b7280' }}
                      >
                        {acao.protocolo}
                      </span>
                      <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-medium', badge.className)}>
                        {badge.label}
                      </span>
                      <span className="font-medium text-slate-700 truncate">{acao.acao}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-2">
        <Link
          href="/jornadas"
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
        >
          🗺️ Ver Todas as Jornadas
        </Link>
        <Link
          href={`/pacientes/${pacienteId}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          Voltar ao Paciente →
        </Link>
      </div>
    </div>
  )
}

// ── Stepper de passos do protocolo ───────────────────────────
function StepperProtocolo({ codigo, passoAtual }: { codigo: string; passoAtual: number }) {
  const protocolo = PROTOCOLO_MAP.get(codigo)
  if (!protocolo) return null
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {protocolo.passos_fluxo.map((passo, idx) => {
        const num = idx + 1
        const done = num < passoAtual
        const active = num === passoAtual
        return (
          <div key={num} className="flex items-center gap-1 shrink-0">
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                done ? 'bg-emerald-500 text-white' :
                active ? 'bg-blue-600 text-white ring-2 ring-blue-300' :
                'bg-slate-200 text-slate-500'
              )}>
                {done ? '✓' : num}
              </div>
              <p className={cn(
                'mt-1 max-w-[70px] text-center text-[9px] leading-tight',
                active ? 'font-semibold text-blue-600' : 'text-slate-400'
              )}>
                {passo.titulo}
              </p>
            </div>
            {idx < protocolo.passos_fluxo.length - 1 && (
              <div className={cn('mb-4 h-0.5 w-6 flex-shrink-0', done ? 'bg-emerald-300' : 'bg-slate-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function ConsultaPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const paciente = demoPacientes.find(p => p.id === id)
  const linhasAtivas = demoLinhas.filter(l => l.paciente_id === id && l.status === 'ativo')

  const [tipoConsulta, setTipoConsulta] = useState('retorno')
  const [vitais, setVitais] = useState<Vitais>({
    pa1_s: '', pa1_d: '', pa2_s: '', pa2_d: '',
    fc: '', spo2: '', temp: '',
    peso: '', altura: '', ca: '', glicemia: '',
  })
  const [metricas, setMetricas] = useState<MetricasMap>({})
  const [examesSolicitados, setExamesSolicitados] = useState<string[]>([])
  const [exameExtra, setExameExtra] = useState('')
  const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' })
  const [prescricoes, setPrescricoes] = useState('')
  const [retornoDias, setRetornoDias] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [resumo, setResumo] = useState<ResumoData | null>(null)

  const imc = calcIMC(vitais.peso, vitais.altura)
  const paAlert = alertaPA(vitais.pa1_s, vitais.pa1_d)
  const glicAlert = alertaGlicemia(vitais.glicemia)

  function setMetricaProtocolo(protocolo: string, chave: string, valor: string | boolean) {
    setMetricas(m => ({
      ...m,
      [protocolo]: { ...(m[protocolo] ?? {}), [chave]: valor },
    }))
  }

  function toggleExame(exame: string) {
    setExamesSolicitados(prev =>
      prev.includes(exame) ? prev.filter(e => e !== exame) : [...prev, exame]
    )
  }

  async function finalizarConsulta() {
    setSalvando(true)

    // Build flattened metricas for each protocol
    const historico = demoConsultas.filter(c => c.paciente_id === id)
    const exames = demoExames.filter(e => e.paciente_id === id)

    const jornadasResultados: { protocolo: string; status: StatusJornada; passoAnterior: number }[] = []

    for (const linha of linhasAtivas) {
      const cod = linha.protocolo_codigo
      const protMetricas = metricas[cod] ?? {}
      const passoAnterior = linha.nivel_gravidade === 'controlado' ? 5 : linha.nivel_gravidade === 'parcial' ? 3 : 2

      const metricasCompletas: Record<string, any> = {
        ...protMetricas,
        pa_sistolica:          vitais.pa1_s ? parseFloat(vitais.pa1_s) : undefined,
        pa_diastolica:         vitais.pa1_d ? parseFloat(vitais.pa1_d) : undefined,
        peso:                  vitais.peso  ? parseFloat(vitais.peso)  : undefined,
        altura:                vitais.altura? parseFloat(vitais.altura): undefined,
        circunferencia_abdominal: vitais.ca ? parseFloat(vitais.ca)   : undefined,
        passo_protocolo: passoAnterior,
      }

      const status = await calcularJornada(id, cod, metricasCompletas, historico, exames)
      jornadasResultados.push({ protocolo: cod, status, passoAnterior })
    }

    // Determine which steps can advance (no bloqueante unmet)
    const avancos = jornadasResultados
      .filter(({ status }) => status.acoes_pendentes.filter(a => a.bloqueante).length === 0 && status.passo_atual < 5)
      .map(({ protocolo, status }) => ({
        protocolo,
        de: status.passo_atual,
        para: Math.min(5, status.passo_atual + 1),
        titulo_novo: status.proximo_passo,
      }))

    // Next return date
    const dataRetorno = retornoDias
      ? new Date(Date.now() + parseInt(retornoDias) * 86400000)
      : (() => {
          const melhorRetorno = jornadasResultados.reduce((min, { status }) => {
            const proto = PROTOCOLO_MAP.get(status.protocolo)
            const dias = proto?.retorno_dias[status.status_controle] ?? 30
            return Math.min(min, dias)
          }, 90)
          const d = new Date(); d.setDate(d.getDate() + melhorRetorno); return d
        })()

    // Top priority actions for the generated summary
    const proximasAcoes = gerarProximasAcoes([{
      paciente: { id, nome: paciente!.nome },
      jornadas: jornadasResultados.map(r => r.status),
      metricas: jornadasResultados[0]
        ? { pa_sistolica: vitais.pa1_s ? parseFloat(vitais.pa1_s) : undefined, pa_diastolica: vitais.pa1_d ? parseFloat(vitais.pa1_d) : undefined }
        : {},
      dias_sem_retorno: 0,
    }])

    setSalvando(false)
    setResumo({
      jornadas: jornadasResultados.map(r => r.status),
      avancos,
      retorno_data: dataRetorno,
      exames_solicitados: examesSolicitados,
      proximas_acoes: proximasAcoes.slice(0, 5),
    })
  }

  if (!paciente) return (
    <div className="flex min-h-[400px] items-center justify-center text-slate-500">
      Paciente não encontrado.
    </div>
  )

  if (resumo) return (
    <ResumoJornada
      pacienteNome={paciente!.nome}
      pacienteId={id}
      resumo={resumo}
    />
  )

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Seção 1 — Identificação */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{paciente.nome}</h2>
            <p className="text-sm text-slate-500">
              {paciente.matricula} · {calcularIdade(paciente.data_nascimento)} anos · {paciente.setor}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {linhasAtivas.map(l => {
                const p = PROTOCOLO_MAP.get(l.protocolo_codigo)
                return (
                  <span key={l.id} className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: p?.cor ?? '#6b7280' }}>
                    {l.protocolo_codigo}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-xs">Tipo de consulta</Label>
              <select
                value={tipoConsulta}
                onChange={e => setTipoConsulta(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="retorno">Retorno</option>
                <option value="consulta">Consulta nova</option>
                <option value="triagem">Triagem</option>
                <option value="urgencia">Urgência</option>
              </select>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Data</p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-slate-500">{demoProfissional.nome}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="vitais">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-xl h-auto">
          {[
            { value: 'vitais', label: '🩺 Sinais Vitais' },
            { value: 'protocolos', label: '📋 Protocolos' },
            { value: 'exames', label: '🔬 Exames' },
            { value: 'plano', label: '📝 Plano SOAP' },
          ].map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Seção 2 — Sinais vitais */}
        <TabsContent value="vitais" className="pt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
            {paAlert === 'critico' && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                🚨 PA ≥ 160/100 — Crise hipertensiva! Avaliação imediata necessária.
              </div>
            )}
            {paAlert === 'atencao' && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                ⚠️ PA ≥ 140/90 — Fora de meta. Reavaliar tratamento.
              </div>
            )}
            {glicAlert === 'critico' && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                🚨 Glicemia &gt; 300 mg/dL — Hiperglicemia grave! Verificar sintomas de cetose.
              </div>
            )}
            {glicAlert === 'atencao' && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                ⚠️ Glicemia &gt; 180 mg/dL — Acima da meta pós-prandial.
              </div>
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Pressão Arterial</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <Label className="text-xs">1ª medida — Sistólica</Label>
                  <Input type="number" value={vitais.pa1_s} onChange={e => setVitais(v => ({ ...v, pa1_s: e.target.value }))} placeholder="120" className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">1ª medida — Diastólica</Label>
                  <Input type="number" value={vitais.pa1_d} onChange={e => setVitais(v => ({ ...v, pa1_d: e.target.value }))} placeholder="80" className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">2ª medida — Sistólica</Label>
                  <Input type="number" value={vitais.pa2_s} onChange={e => setVitais(v => ({ ...v, pa2_s: e.target.value }))} placeholder="118" className="mt-1 h-8" />
                </div>
                <div>
                  <Label className="text-xs">2ª medida — Diastólica</Label>
                  <Input type="number" value={vitais.pa2_d} onChange={e => setVitais(v => ({ ...v, pa2_d: e.target.value }))} placeholder="78" className="mt-1 h-8" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <Label className="text-xs">FC (bpm)</Label>
                <Input type="number" value={vitais.fc} onChange={e => setVitais(v => ({ ...v, fc: e.target.value }))} placeholder="72" className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">SpO₂ (%)</Label>
                <Input type="number" value={vitais.spo2} onChange={e => setVitais(v => ({ ...v, spo2: e.target.value }))} placeholder="98" className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Temperatura (°C)</Label>
                <Input type="number" step="0.1" value={vitais.temp} onChange={e => setVitais(v => ({ ...v, temp: e.target.value }))} placeholder="36.5" className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Glicemia capilar (mg/dL)</Label>
                <Input type="number" value={vitais.glicemia} onChange={e => setVitais(v => ({ ...v, glicemia: e.target.value }))} placeholder="95" className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Peso (kg)</Label>
                <Input type="number" step="0.1" value={vitais.peso} onChange={e => setVitais(v => ({ ...v, peso: e.target.value }))} placeholder="80.0" className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">Altura (m)</Label>
                <Input type="number" step="0.01" value={vitais.altura} onChange={e => setVitais(v => ({ ...v, altura: e.target.value }))} placeholder="1.75" className="mt-1 h-8" />
              </div>
              <div>
                <Label className="text-xs">IMC (calculado)</Label>
                <div className={cn(
                  'mt-1 flex h-8 items-center rounded-md border px-3 text-sm font-semibold',
                  imc !== '—' && parseFloat(imc) >= 30 ? 'border-amber-300 bg-amber-50 text-amber-700' :
                  imc !== '—' && parseFloat(imc) >= 25 ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                  'border-slate-200 bg-slate-50 text-slate-600'
                )}>
                  {imc} {imc !== '—' ? 'kg/m²' : ''}
                </div>
              </div>
              <div>
                <Label className="text-xs">Circ. abdominal (cm)</Label>
                <Input type="number" step="0.5" value={vitais.ca} onChange={e => setVitais(v => ({ ...v, ca: e.target.value }))} placeholder="90" className="mt-1 h-8" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Seção 3 — Protocolos */}
        <TabsContent value="protocolos" className="pt-4">
          {linhasAtivas.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Paciente sem linhas de cuidado ativas.</p>
          )}
          <Tabs defaultValue={linhasAtivas[0]?.protocolo_codigo}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl mb-4">
              {linhasAtivas.map(l => {
                const p = PROTOCOLO_MAP.get(l.protocolo_codigo)
                return (
                  <TabsTrigger
                    key={l.protocolo_codigo}
                    value={l.protocolo_codigo}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {p?.icone} {l.protocolo_codigo}
                    {l.nivel_gravidade && (
                      <span className={cn(
                        'ml-1 h-2 w-2 rounded-full inline-block',
                        l.nivel_gravidade === 'controlado' ? 'bg-emerald-500' :
                        l.nivel_gravidade === 'parcial' ? 'bg-amber-500' : 'bg-red-500'
                      )} />
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {linhasAtivas.map(l => {
              const protocolo = PROTOCOLO_MAP.get(l.protocolo_codigo)
              if (!protocolo) return null
              const passoAtual = l.nivel_gravidade === 'controlado' ? 5 :
                                 l.nivel_gravidade === 'parcial' ? 3 : 2
              return (
                <TabsContent key={l.protocolo_codigo} value={l.protocolo_codigo}>
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                    {/* Status alert */}
                    <div className={cn(
                      'rounded-lg border px-4 py-3',
                      l.nivel_gravidade === 'controlado' ? 'border-emerald-200 bg-emerald-50' :
                      l.nivel_gravidade === 'parcial' ? 'border-amber-200 bg-amber-50' :
                      'border-red-200 bg-red-50'
                    )}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{protocolo.icone}</span>
                        <div>
                          <p className="font-semibold text-slate-800">{protocolo.nome}</p>
                          <p className="text-xs text-slate-600">
                            Status: {l.nivel_gravidade ? <StatusPill status={l.nivel_gravidade} size="sm" /> : '—'}
                            {' · '}Meta: {protocolo.criterios_controle[0]}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stepper */}
                    <div>
                      <h4 className="mb-3 text-xs font-semibold uppercase text-slate-500">Fluxo do Protocolo</h4>
                      <StepperProtocolo codigo={l.protocolo_codigo} passoAtual={passoAtual} />
                    </div>

                    {/* Sugestão */}
                    {protocolo.passos_fluxo[passoAtual - 1] && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                        <p className="text-xs font-semibold text-blue-700">
                          💡 Passo atual: {protocolo.passos_fluxo[passoAtual - 1].titulo}
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          {protocolo.passos_fluxo[passoAtual - 1].descricao}
                        </p>
                      </div>
                    )}

                    {/* Campos específicos */}
                    <div>
                      <h4 className="mb-3 text-xs font-semibold uppercase text-slate-500">Dados desta consulta</h4>
                      <CamposProtocolo
                        codigo={l.protocolo_codigo}
                        metricas={metricas[l.protocolo_codigo] ?? {}}
                        setMetrica={(k, v) => setMetricaProtocolo(l.protocolo_codigo, k, v)}
                      />
                    </div>
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </TabsContent>

        {/* Seção 4 — Exames */}
        <TabsContent value="exames" className="pt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-800">Exames Recomendados pelos Protocolos</h3>
            <div className="space-y-3">
              {linhasAtivas.map(l => {
                const protocolo = PROTOCOLO_MAP.get(l.protocolo_codigo)
                if (!protocolo || !protocolo.exames_obrigatorios.length) return null
                return (
                  <div key={l.protocolo_codigo}>
                    <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
                      {protocolo.icone} {protocolo.codigo}
                    </p>
                    <div className="space-y-2">
                      {protocolo.exames_obrigatorios.map(exame => (
                        <label key={exame} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50">
                          <Checkbox
                            checked={examesSolicitados.includes(exame)}
                            onCheckedChange={() => toggleExame(exame)}
                          />
                          <span className="text-sm text-slate-700">{exame}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div>
              <Label className="text-sm font-semibold">Adicionar exame personalizado</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={exameExtra}
                  onChange={e => setExameExtra(e.target.value)}
                  placeholder="Nome do exame…"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (exameExtra.trim()) {
                      toggleExame(exameExtra.trim())
                      setExameExtra('')
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </div>

            {examesSolicitados.length > 0 && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">Exames selecionados ({examesSolicitados.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {examesSolicitados.map(e => (
                    <span key={e} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Seção 5 — Plano SOAP */}
        <TabsContent value="plano" className="pt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {[
                { key: 's' as const, label: 'S — Subjetivo', placeholder: 'Queixas, sintomas referidos pelo paciente…' },
                { key: 'o' as const, label: 'O — Objetivo', placeholder: 'Exame físico, sinais vitais, dados mensuráveis…' },
                { key: 'a' as const, label: 'A — Avaliação', placeholder: 'Diagnóstico, impressão clínica, problemas identificados…' },
                { key: 'p' as const, label: 'P — Plano', placeholder: 'Condutas, prescrições, encaminhamentos, orientações…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="font-semibold text-slate-700">{label}</Label>
                  <Textarea
                    value={soap[key]}
                    onChange={e => setSoap(s => ({ ...s, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>

            <div>
              <Label className="font-semibold text-slate-700">Prescrições desta consulta</Label>
              <Textarea
                value={prescricoes}
                onChange={e => setPrescricoes(e.target.value)}
                placeholder="Ex: Losartana 100mg 1cp/dia…"
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="font-semibold text-slate-700">Retorno em (dias)</Label>
                <Input
                  type="number"
                  value={retornoDias}
                  onChange={e => setRetornoDias(e.target.value)}
                  placeholder="Ex: 30"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="font-semibold text-slate-700">Data do próximo retorno</Label>
                <Input
                  type="date"
                  value={retornoDias ? new Date(Date.now() + parseInt(retornoDias) * 86400000).toISOString().split('T')[0] : ''}
                  readOnly
                  className="mt-1 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => alert('Rascunho salvo (demo)')}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                💾 Salvar Rascunho
              </Button>
              <Button
                onClick={finalizarConsulta}
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {salvando ? 'Salvando…' : '✅ Finalizar Consulta'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
