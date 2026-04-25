'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { PROTOCOLOS } from '@/lib/protocolos'

const COMORBIDADES = PROTOCOLOS.map(p => ({ codigo: p.codigo, nome: p.nome, cor: p.cor, icone: p.icone }))

export default function NovoPacientePage() {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    data_nascimento: '',
    sexo: '',
    matricula: '',
    setor: '',
    cargo: '',
    telefone: '',
    email: '',
    comorbidades: [] as string[],
    medicamentos_uso: '',
    alergias: '',
    historico_familiar: '',
    tabagismo_status: 'nunca',
    tabagismo_macos_ano: '',
    etilismo: 'nao',
    atividade_fisica: 'sedentario',
  })

  function toggleComorbidade(codigo: string) {
    setForm(prev => ({
      ...prev,
      comorbidades: prev.comorbidades.includes(codigo)
        ? prev.comorbidades.filter(c => c !== codigo)
        : [...prev.comorbidades, codigo],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    await new Promise(r => setTimeout(r, 800))
    setSucesso(true)
    setSalvando(false)
    setTimeout(() => router.push('/pacientes'), 1500)
  }

  if (sucesso) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-800">Paciente cadastrado!</h2>
          <p className="text-slate-500 mt-2">Linhas de cuidado criadas para: {form.comorbidades.join(', ') || 'nenhuma'}</p>
          <p className="text-slate-400 text-sm mt-1">Redirecionando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Novo Paciente</h1>
          <p className="text-sm text-slate-500">Preencha os dados para criar a linha de cuidado</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados pessoais */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">👤 Dados Pessoais</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome completo *</Label>
              <Input
                required
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do colaborador"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data de Nascimento *</Label>
              <Input
                required
                type="date"
                value={form.data_nascimento}
                onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Sexo *</Label>
              <select
                required
                value={form.sexo}
                onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
            </div>
            <div>
              <Label>Matrícula *</Label>
              <Input
                required
                value={form.matricula}
                onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))}
                placeholder="MSP-000"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Setor</Label>
              <Input
                value={form.setor}
                onChange={e => setForm(f => ({ ...f, setor: e.target.value }))}
                placeholder="Produção, Administrativo…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input
                value={form.cargo}
                onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                placeholder="Operador, Analista…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="mt-1"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="colaborador@empresa.com"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Comorbidades e linhas de cuidado */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-800">🏥 Condições Clínicas / Linhas de Cuidado</h2>
          <p className="mb-4 text-xs text-slate-500">Cada condição marcada criará automaticamente uma linha de cuidado ativa.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {COMORBIDADES.map(c => (
              <label
                key={c.codigo}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-colors ${
                  form.comorbidades.includes(c.codigo)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Checkbox
                  checked={form.comorbidades.includes(c.codigo)}
                  onCheckedChange={() => toggleComorbidade(c.codigo)}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-flex rounded px-1 py-0.5 text-[9px] font-bold text-white"
                      style={{ backgroundColor: c.cor }}
                    >
                      {c.codigo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{c.nome}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Dados clínicos */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">💊 Dados Clínicos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Medicamentos em uso</Label>
              <Textarea
                value={form.medicamentos_uso}
                onChange={e => setForm(f => ({ ...f, medicamentos_uso: e.target.value }))}
                placeholder="Liste os medicamentos em uso contínuo…"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Alergias</Label>
              <Input
                value={form.alergias}
                onChange={e => setForm(f => ({ ...f, alergias: e.target.value }))}
                placeholder="Ex: AAS, penicilina…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Histórico familiar relevante</Label>
              <Input
                value={form.historico_familiar}
                onChange={e => setForm(f => ({ ...f, historico_familiar: e.target.value }))}
                placeholder="Ex: pai — IAM precoce, mãe — DM2"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Hábitos */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">🏃 Hábitos de Vida</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Tabagismo</Label>
              <select
                value={form.tabagismo_status}
                onChange={e => setForm(f => ({ ...f, tabagismo_status: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="nunca">Nunca fumou</option>
                <option value="ex">Ex-fumante</option>
                <option value="atual">Fumante ativo</option>
              </select>
            </div>
            {(form.tabagismo_status === 'ex' || form.tabagismo_status === 'atual') && (
              <div>
                <Label>Carga tabágica (maços-ano)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.tabagismo_macos_ano}
                  onChange={e => setForm(f => ({ ...f, tabagismo_macos_ano: e.target.value }))}
                  placeholder="Ex: 20"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Etilismo</Label>
              <select
                value={form.etilismo}
                onChange={e => setForm(f => ({ ...f, etilismo: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="nao">Não usa</option>
                <option value="social">Uso social</option>
                <option value="moderado">Uso moderado</option>
                <option value="pesado">Uso pesado</option>
              </select>
            </div>
            <div>
              <Label>Atividade física</Label>
              <select
                value={form.atividade_fisica}
                onChange={e => setForm(f => ({ ...f, atividade_fisica: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="sedentario">Sedentário</option>
                <option value="insuficiente">Insuficiente (&lt;150 min/sem)</option>
                <option value="ativo">Ativo (150–300 min/sem)</option>
                <option value="muito_ativo">Muito ativo (&gt;300 min/sem)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-500 gap-2" disabled={salvando}>
            {salvando ? 'Salvando…' : '💾 Salvar Paciente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
