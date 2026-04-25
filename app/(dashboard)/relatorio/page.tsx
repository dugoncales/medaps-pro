'use client'

import { useState, useRef } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'
import { demoEmpresa, demoIndicadores, demoLinhas } from '@/lib/demo-data'
import { PROTOCOLO_MAP } from '@/lib/protocolos'
import { MetricCard } from '@/components/shared/MetricCard'
import { ProgressoProtocolo } from '@/components/shared/ProgressoProtocolo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Periodo = 'mensal' | 'trimestral' | 'anual'

const MESES = ['Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26']

function calcProtocoloPct(codigo: string) {
  const linhas = demoLinhas.filter(l => l.protocolo_codigo === codigo && l.status === 'ativo')
  if (!linhas.length) return 0
  return Math.round((linhas.filter(l => l.nivel_gravidade === 'controlado').length / linhas.length) * 100)
}

const PROTOCOLO_BARS = [
  { codigo: 'HAS', nome: 'HAS', cor: '#C0392B' },
  { codigo: 'DM', nome: 'DM', cor: '#D97706' },
  { codigo: 'DIS', nome: 'DIS', cor: '#0D7F4F' },
  { codigo: 'OBE', nome: 'OBE', cor: '#7C3AED' },
  { codigo: 'TAB', nome: 'TAB', cor: '#B91C1C' },
  { codigo: 'DPC', nome: 'DPOC', cor: '#01579B' },
  { codigo: 'TAG', nome: 'TAG', cor: '#1A237E' },
  { codigo: 'CHK', nome: 'CHK', cor: '#1A56A0' },
]

const barData = PROTOCOLO_BARS.map(p => ({
  nome: p.nome,
  pct: calcProtocoloPct(p.codigo),
  fill: p.cor,
}))

const INDICADORES_PROCESSO = [
  { label: 'Check-up realizado no ano', pct: 62 },
  { label: 'Mamografia em dia (F≥40a)', pct: 48 },
  { label: 'DNA-HPV em dia (F 25-64a)', pct: 55 },
  { label: 'Vacinação Influenza 2026', pct: 32 },
  { label: 'PHQ-9 aplicado (últimos 12m)', pct: 75 },
  { label: 'AUDIT-C aplicado (últimos 12m)', pct: 68 },
]

export default function RelatorioPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mensal')
  const reportRef = useRef<HTMLDivElement>(null)

  const ultimoIndicador = demoIndicadores[demoIndicadores.length - 1]
  const taxaControle = ultimoIndicador?.taxa_controle_geral ?? 37
  const totalPacientes = ultimoIndicador?.total_pacientes ?? 8
  const roiEstimado = ultimoIndicador?.roi_estimado ?? 59200

  const afastamentosEvitados = Math.round(totalPacientes * 0.8)
  const economiaMes = roiEstimado
  const roiMultiplo = (roiEstimado / 15000).toFixed(1)

  // Série temporal para gráfico de evolução
  const tendenciaData = demoIndicadores.map((ind, i) => ({
    mes: MESES[i] ?? '',
    controle: ind.taxa_controle_geral,
    has: ind.has_controlados_pct,
    dm: ind.dm_controlados_pct,
  }))

  async function handleExportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    if (!reportRef.current) return

    const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const imgHeight = (canvas.height * pageWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight)
    pdf.save(`MedAPS_Relatorio_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function handleExportExcel() {
    const rows = [
      ['Indicador', 'Valor'],
      ['Total pacientes', totalPacientes],
      ['Taxa controle geral (%)', taxaControle],
      ['ROI estimado (R$)', roiEstimado],
      ['Afastamentos evitados', afastamentosEvitados],
      ...PROTOCOLO_BARS.map(p => [`${p.nome} controlados (%)`, calcProtocoloPct(p.codigo)]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'MedAPS_Relatorio.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Relatório Empresa</h1>
          <p className="text-sm text-slate-500">{demoEmpresa.nome} · {demoEmpresa.total_colaboradores} colaboradores</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Seletor de período */}
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            {(['mensal', 'trimestral', 'anual'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  periodo === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
            📊 Excel
          </Button>
          <Button size="sm" onClick={handleExportPDF} className="gap-1.5 bg-blue-600 hover:bg-blue-500">
            📄 PDF
          </Button>
        </div>
      </div>

      {/* Conteúdo do relatório (capturado para PDF) */}
      <div ref={reportRef} className="space-y-6">
        {/* KPI grandes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Colaboradores em Linha de Cuidado"
            value={totalPacientes}
            subtexto={`de ${demoEmpresa.total_colaboradores} colaboradores`}
            cor="blue"
            icone={<span>👥</span>}
          />
          <MetricCard
            label="Taxa de Controle Geral"
            value={`${taxaControle}%`}
            subtexto="↑ 7pp vs. trimestre anterior"
            cor="green"
            tendencia="up"
            icone={<span>📈</span>}
          />
          <MetricCard
            label="Custo Evitado Estimado"
            value={`R$ ${roiEstimado.toLocaleString('pt-BR')}`}
            subtexto={`ROI ${roiMultiplo}× do investimento`}
            cor="green"
            tendencia="up"
            icone={<span>💰</span>}
          />
        </div>

        {/* Grid: Indicadores + Gráfico de barras */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Indicadores de processo */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-800">📋 Indicadores de Processo</h3>
            <div className="space-y-3">
              {INDICADORES_PROCESSO.map(ind => (
                <ProgressoProtocolo
                  key={ind.label}
                  label={ind.label}
                  codigo=""
                  pct={ind.pct}
                />
              ))}
            </div>
          </div>

          {/* Gráfico de barras por protocolo */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-800">📊 % Controlados por Protocolo</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Controlados']} />
                <Bar dataKey="pct" name="% Controlados" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pct >= 70 ? '#10b981' : entry.pct >= 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tendência temporal */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800">📈 Evolução da Taxa de Controle</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tendenciaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`]} />
              <Legend />
              <Line type="monotone" dataKey="controle" stroke="#2563eb" strokeWidth={2.5} dot name="Geral" />
              <Line type="monotone" dataKey="has" stroke="#C0392B" strokeWidth={1.5} strokeDasharray="4 4" dot name="HAS" />
              <Line type="monotone" dataKey="dm" stroke="#D97706" strokeWidth={1.5} strokeDasharray="4 4" dot name="DM" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Impacto econômico */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="mb-4 font-semibold text-blue-800">💰 Impacto Econômico Estimado</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-blue-200 bg-white p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{afastamentosEvitados}</p>
              <p className="text-sm text-blue-600 mt-1">Afastamentos evitados</p>
              <p className="text-xs text-slate-400 mt-0.5">no último trimestre</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-white p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700">
                R$ {(economiaMes / 1000).toFixed(0)}k
              </p>
              <p className="text-sm text-emerald-600 mt-1">Economia estimada</p>
              <p className="text-xs text-slate-400 mt-0.5">redução de custos assistenciais</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-white p-4 text-center">
              <p className="text-3xl font-bold text-violet-700">{roiMultiplo}×</p>
              <p className="text-sm text-violet-600 mt-1">ROI do ambulatório</p>
              <p className="text-xs text-slate-400 mt-0.5">retorno sobre investimento</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-600">
            * Estimativas baseadas em custo médio de afastamento INSS (R$ 1.200/dia) e redução de internações hospitalares por HAS/DM descontrolados.
          </p>
        </div>
      </div>
    </div>
  )
}
