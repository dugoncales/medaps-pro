'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { PROTOCOLOS } from '@/lib/protocolos'
import { useRuntimeStore, gerarId } from '@/lib/store/runtime-store'
import { demoEmpresa, demoProfissional, IS_DEMO_MODE } from '@/lib/demo-data'
import { createClient } from '@/lib/supabase/client'
import type { Paciente, LinhaCuidado } from '@/types'

const COMORBIDADES = PROTOCOLOS.map(p => ({ codigo: p.codigo, nome: p.nome, cor: p.cor, icone: p.icone }))

// ─── Validação ───────────────────────────────────────────────────────────────

const PacienteSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres'),
  data_nascimento: z
    .string()
    .min(1, 'Data de nascimento é obrigatória')
    .refine((d) => {
      const data = new Date(d)
      if (isNaN(data.getTime())) return false
      const ano = data.getFullYear()
      return ano >= 1920 && ano <= new Date().getFullYear()
    }, 'Data de nascimento inválida (ano deve estar entre 1920 e o ano atual)'),
  sexo: z.enum(['M', 'F', 'O'], { message: 'Selecione o sexo' }),
  matricula: z.string().trim().min(1, 'Matrícula é obrigatória'),
  setor: z.string().optional(),
  cargo: z.string().optional(),
  telefone: z.string().optional(),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional(),
  comorbidades: z.array(z.string()),
  medicamentos_uso: z.string().optional(),
  alergias: z.string().optional(),
  historico_familiar: z.string().optional(),
  tabagismo_status: z.enum(['nunca', 'ex', 'atual']),
  tabagismo_macos_ano: z.string().optional(),
  etilismo: z.string(),
  atividade_fisica: z.string(),
})

type FormState = z.infer<typeof PacienteSchema>

const INITIAL: FormState = {
  nome: '',
  data_nascimento: '',
  sexo: 'M',
  matricula: '',
  setor: '',
  cargo: '',
  telefone: '',
  email: '',
  comorbidades: [],
  medicamentos_uso: '',
  alergias: '',
  historico_familiar: '',
  tabagismo_status: 'nunca',
  tabagismo_macos_ano: '',
  etilismo: 'nao',
  atividade_fisica: 'sedentario',
}

// ─── Tradução de códigos de erro Postgres ────────────────────────────────────

interface PgError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function mensagemErroSupabase(err: PgError, contexto: string): string {
  const code = err.code ?? ''
  const msg = err.message ?? ''
  if (code === '23505' || /duplicate key/i.test(msg)) {
    if (/matricula/i.test(msg)) return 'Matrícula já cadastrada para esta empresa.'
    return 'Registro duplicado — já existe um item com esses dados únicos.'
  }
  if (code === '42501' || /row-level security/i.test(msg)) {
    return 'Sem permissão para gravar (RLS bloqueou). Verifique se o profissional está vinculado a uma empresa.'
  }
  if (code === '23503') return 'Referência inválida (FK): empresa ou profissional não existe.'
  if (code === '42703') return 'Coluna não existe no schema. Rode as migrations mais recentes.'
  if (code === 'PGRST116') return 'Registro não encontrado.'
  return `${contexto}: ${msg || 'erro desconhecido'}${code ? ` (code: ${code})` : ''}`
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function NovoPacientePage() {
  const router = useRouter()
  const adicionarPaciente = useRuntimeStore((s) => s.adicionarPaciente)
  const adicionarLinha = useRuntimeStore((s) => s.adicionarLinha)

  const [form, setForm] = useState<FormState>({ ...INITIAL, sexo: 'M' as const })
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (erros[key as string]) setErros((e) => { const n = { ...e }; delete n[key as string]; return n })
  }

  function toggleComorbidade(codigo: string) {
    setForm(prev => ({
      ...prev,
      comorbidades: prev.comorbidades.includes(codigo)
        ? prev.comorbidades.filter(c => c !== codigo)
        : [...prev.comorbidades, codigo],
    }))
  }

  // ─── Garantir que o profissional logado existe na tabela profissionais ───
  // Se o usuário Auth ainda não tem profissional vinculado, cria um (auto-onboarding)
  // junto com a primeira empresa disponível (ou uma empresa demo, se nenhuma existir).
  async function obterOuCriarProfissional(supabase: ReturnType<typeof createClient>, userId: string, userEmail: string | null) {
    const { data: existente, error: errSel } = await supabase
      .from('profissionais')
      .select('id, empresa_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (errSel && errSel.code !== 'PGRST116') {
      console.error('[NovoPaciente] erro buscando profissional:', errSel)
      throw new Error(mensagemErroSupabase(errSel, 'Buscar profissional'))
    }
    if (existente) return existente

    // Profissional não existe — buscar (ou criar) empresa
    const { data: empresa, error: errEmp } = await supabase
      .from('empresas')
      .select('id')
      .limit(1)
      .maybeSingle()

    let empresaId = empresa?.id as string | undefined

    if (errEmp && errEmp.code !== 'PGRST116') {
      console.error('[NovoPaciente] erro buscando empresa:', errEmp)
      throw new Error(mensagemErroSupabase(errEmp, 'Buscar empresa'))
    }

    if (!empresaId) {
      const { data: novaEmpresa, error: errNovaEmp } = await supabase
        .from('empresas')
        .insert({
          nome: 'Empresa Demonstração',
          cnpj: '00.000.000/0001-00',
          total_colaboradores: 0,
        })
        .select('id')
        .single()
      if (errNovaEmp || !novaEmpresa) {
        console.error('[NovoPaciente] erro criando empresa demo:', errNovaEmp)
        throw new Error(mensagemErroSupabase(errNovaEmp ?? {}, 'Criar empresa demonstração'))
      }
      empresaId = novaEmpresa.id
    }

    const { data: novoProf, error: errIns } = await supabase
      .from('profissionais')
      .insert({
        user_id: userId,
        nome: userEmail ?? 'Profissional',
        cargo: 'medico',
        empresa_id: empresaId,
        ativo: true,
      })
      .select('id, empresa_id')
      .single()

    if (errIns || !novoProf) {
      console.error('[NovoPaciente] erro criando profissional:', errIns)
      throw new Error(mensagemErroSupabase(errIns ?? {}, 'Criar profissional'))
    }
    return novoProf
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErroGeral(null)

    const parsed = PacienteSchema.safeParse(form)
    if (!parsed.success) {
      const novosErros: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.')
        if (!novosErros[path]) novosErros[path] = issue.message
      }
      setErros(novosErros)
      setErroGeral('Existem campos obrigatórios não preenchidos. Verifique abaixo.')
      console.warn('[NovoPaciente] validação falhou:', parsed.error.issues)
      return
    }

    const dados = parsed.data
    setErros({})
    setSalvando(true)

    try {
      // ─── Modo demo (sem Supabase configurado) ─────────────────────────
      if (IS_DEMO_MODE) {
        const pacienteId = gerarId('pac')
        const agora = new Date().toISOString()
        const novoPaciente: Paciente = {
          id: pacienteId,
          empresa_id: demoEmpresa.id,
          matricula: dados.matricula,
          nome: dados.nome,
          data_nascimento: dados.data_nascimento,
          sexo: dados.sexo,
          setor: dados.setor || undefined,
          comorbidades: dados.comorbidades,
          medicamentos_uso: dados.medicamentos_uso || undefined,
          tabagismo_status: dados.tabagismo_status,
          tabagismo_macos_ano: dados.tabagismo_macos_ano ? Number(dados.tabagismo_macos_ano) : undefined,
          ativo: true,
          created_at: agora,
        }
        adicionarPaciente(novoPaciente)
        for (const codigo of dados.comorbidades) {
          const linha: LinhaCuidado = {
            id: gerarId('lc'),
            paciente_id: pacienteId,
            protocolo_codigo: codigo,
            status: 'ativo',
            nivel_gravidade: 'parcial',
            profissional_id: demoProfissional.id,
            created_at: agora,
            updated_at: agora,
          }
          adicionarLinha(linha)
        }
        router.push(`/pacientes/${pacienteId}`)
        return
      }

      // ─── Modo Supabase real ───────────────────────────────────────────
      const supabase = createClient()

      // a) Usuário autenticado
      const { data: { user }, error: errUser } = await supabase.auth.getUser()
      if (errUser || !user) {
        console.error('[NovoPaciente] sem usuário autenticado:', errUser)
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      // b) Profissional + empresa (auto-cria se faltar)
      const profissional = await obterOuCriarProfissional(supabase, user.id, user.email ?? null)

      // c) Inserir paciente — apenas colunas que existem no schema
      const tabagismoMacos = dados.tabagismo_macos_ano ? Number(dados.tabagismo_macos_ano) : null
      const { data: novoPaciente, error: errPac } = await supabase
        .from('pacientes')
        .insert({
          empresa_id: profissional.empresa_id,
          matricula: dados.matricula,
          nome: dados.nome,
          data_nascimento: dados.data_nascimento,
          sexo: dados.sexo,
          setor: dados.setor || null,
          comorbidades: dados.comorbidades,
          medicamentos_uso: dados.medicamentos_uso || null,
          tabagismo_status: dados.tabagismo_status,
          tabagismo_macos_ano: tabagismoMacos,
          ativo: true,
        })
        .select('id')
        .single()

      if (errPac || !novoPaciente) {
        console.error('[NovoPaciente] erro inserindo paciente:', errPac)
        throw new Error(mensagemErroSupabase(errPac ?? {}, 'Inserir paciente'))
      }

      // d) Linhas de cuidado — uma por comorbidade marcada
      const linhasInseridas: LinhaCuidado[] = []
      if (dados.comorbidades.length > 0) {
        const linhasInsert = dados.comorbidades.map((codigo) => ({
          paciente_id: novoPaciente.id,
          protocolo_codigo: codigo,
          status: 'ativo' as const,
          nivel_gravidade: 'parcial' as const,
          profissional_id: profissional.id,
        }))
        const { data: linhasData, error: errLin } = await supabase
          .from('linhas_cuidado')
          .insert(linhasInsert)
          .select()
        if (errLin) {
          console.error('[NovoPaciente] erro inserindo linhas_cuidado:', errLin)
          setErroGeral(`Paciente criado, mas ${dados.comorbidades.length} linha(s) de cuidado falharam: ${mensagemErroSupabase(errLin, 'Linhas de cuidado')}`)
          setTimeout(() => router.push(`/pacientes/${novoPaciente.id}`), 2000)
          return
        }
        linhasInseridas.push(...(linhasData ?? []))
      }

      // Cache local — write-through para o store, garante UI imediata
      // após o redirect (sem esperar nova rodada de fetch ao Supabase).
      adicionarPaciente({
        id: novoPaciente.id,
        empresa_id: profissional.empresa_id,
        matricula: dados.matricula,
        nome: dados.nome,
        data_nascimento: dados.data_nascimento,
        sexo: dados.sexo,
        setor: dados.setor || undefined,
        comorbidades: dados.comorbidades,
        medicamentos_uso: dados.medicamentos_uso || undefined,
        tabagismo_status: dados.tabagismo_status,
        tabagismo_macos_ano: tabagismoMacos ?? undefined,
        ativo: true,
        created_at: new Date().toISOString(),
      })
      for (const l of linhasInseridas) adicionarLinha(l)

      // e) Sucesso → redireciona para o perfil do paciente novo
      router.push(`/pacientes/${novoPaciente.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[NovoPaciente] erro ao salvar:', err)
      setErroGeral(`Falha ao salvar paciente: ${msg}`)
      setSalvando(false)
    }
  }

  function FieldError({ campo }: { campo: string }) {
    if (!erros[campo]) return null
    return <p className="mt-1 text-xs text-red-600">{erros[campo]}</p>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Novo Paciente</h1>
          <p className="text-sm text-slate-500">Preencha os dados para criar a linha de cuidado</p>
        </div>
        <Button variant="outline" type="button" onClick={() => router.back()}>Cancelar</Button>
      </div>

      {erroGeral && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          ⚠️ {erroGeral}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Dados pessoais */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">👤 Dados Pessoais</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome completo *</Label>
              <Input
                value={form.nome}
                onChange={e => update('nome', e.target.value)}
                placeholder="Nome do colaborador"
                className="mt-1"
              />
              <FieldError campo="nome" />
            </div>
            <div>
              <Label>Data de Nascimento *</Label>
              <Input
                type="date"
                min="1920-01-01"
                max={new Date().toISOString().split('T')[0]}
                value={form.data_nascimento}
                onChange={e => update('data_nascimento', e.target.value)}
                className="mt-1"
              />
              <FieldError campo="data_nascimento" />
            </div>
            <div>
              <Label>Sexo *</Label>
              <select
                value={form.sexo}
                onChange={e => update('sexo', e.target.value as FormState['sexo'])}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
              <FieldError campo="sexo" />
            </div>
            <div>
              <Label>Matrícula *</Label>
              <Input
                value={form.matricula}
                onChange={e => update('matricula', e.target.value)}
                placeholder="MSP-000"
                className="mt-1"
              />
              <FieldError campo="matricula" />
            </div>
            <div>
              <Label>Setor</Label>
              <Input
                value={form.setor}
                onChange={e => update('setor', e.target.value)}
                placeholder="Produção, Administrativo…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input
                value={form.cargo}
                onChange={e => update('cargo', e.target.value)}
                placeholder="Operador, Analista…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={e => update('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
                className="mt-1"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="colaborador@empresa.com"
                className="mt-1"
              />
              <FieldError campo="email" />
            </div>
          </div>
        </div>

        {/* Comorbidades */}
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
          {form.comorbidades.length > 0 && (
            <p className="mt-3 text-xs text-blue-600">
              {form.comorbidades.length} linha{form.comorbidades.length > 1 ? 's' : ''} de cuidado será{form.comorbidades.length > 1 ? 'ão' : ''} criada{form.comorbidades.length > 1 ? 's' : ''}: {form.comorbidades.join(', ')}
            </p>
          )}
        </div>

        {/* Dados clínicos */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">💊 Dados Clínicos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Medicamentos em uso</Label>
              <Textarea
                value={form.medicamentos_uso}
                onChange={e => update('medicamentos_uso', e.target.value)}
                placeholder="Liste os medicamentos em uso contínuo…"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Alergias</Label>
              <Input
                value={form.alergias}
                onChange={e => update('alergias', e.target.value)}
                placeholder="Ex: AAS, penicilina…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Histórico familiar relevante</Label>
              <Input
                value={form.historico_familiar}
                onChange={e => update('historico_familiar', e.target.value)}
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
                onChange={e => update('tabagismo_status', e.target.value as FormState['tabagismo_status'])}
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
                  onChange={e => update('tabagismo_macos_ano', e.target.value)}
                  placeholder="Ex: 20"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Etilismo</Label>
              <select
                value={form.etilismo}
                onChange={e => update('etilismo', e.target.value)}
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
                onChange={e => update('atividade_fisica', e.target.value)}
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
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={salvando}>
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
