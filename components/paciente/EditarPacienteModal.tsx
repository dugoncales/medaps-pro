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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { IS_DEMO_MODE } from '@/lib/demo-data'
import { useRuntimeStore } from '@/lib/store/runtime-store'
import { useToastStore } from '@/lib/store/toast-store'
import type { Paciente } from '@/types'

interface Props {
  aberto: boolean
  onFechar: () => void
  paciente: Paciente
  onAtualizado: (p: Paciente) => void
}

type FormState = {
  nome: string
  setor: string
  comorbidadesTxt: string
  medicamentos_uso: string
  tabagismo_status: 'nunca' | 'ex' | 'atual'
  tabagismo_macos_ano: string
}

export function EditarPacienteModal(props: Props) {
  if (!props.aberto) return null
  return <EditarPacienteModalInner {...props} />
}

function EditarPacienteModalInner({ onFechar, paciente, onAtualizado }: Props) {
  const atualizarRuntime = useRuntimeStore(s => s.atualizarPaciente)
  const pushToast = useToastStore(s => s.push)

  const [form, setForm] = useState<FormState>({
    nome: paciente.nome,
    setor: paciente.setor ?? '',
    comorbidadesTxt: (paciente.comorbidades ?? []).join(', '),
    medicamentos_uso: paciente.medicamentos_uso ?? '',
    tabagismo_status: paciente.tabagismo_status ?? 'nunca',
    tabagismo_macos_ano: paciente.tabagismo_macos_ano?.toString() ?? '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório.')
      return
    }
    setSalvando(true)
    setErro(null)

    const macosAno = form.tabagismo_macos_ano.trim()
      ? Number(form.tabagismo_macos_ano)
      : null
    if (macosAno !== null && (!Number.isFinite(macosAno) || macosAno < 0)) {
      setErro('Maços-ano deve ser um número válido.')
      setSalvando(false)
      return
    }

    const comorbidades = form.comorbidadesTxt
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.toUpperCase())

    const patch: Partial<Paciente> = {
      nome: form.nome.trim(),
      setor: form.setor.trim() || undefined,
      comorbidades,
      medicamentos_uso: form.medicamentos_uso.trim() || undefined,
      tabagismo_status: form.tabagismo_status,
      tabagismo_macos_ano:
        form.tabagismo_status === 'nunca'
          ? undefined
          : (macosAno ?? undefined),
    }

    try {
      if (!IS_DEMO_MODE) {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('pacientes')
          .update({
            nome: patch.nome,
            setor: patch.setor ?? null,
            comorbidades: patch.comorbidades ?? [],
            medicamentos_uso: patch.medicamentos_uso ?? null,
            tabagismo_status: patch.tabagismo_status ?? null,
            tabagismo_macos_ano: patch.tabagismo_macos_ano ?? null,
          })
          .eq('id', paciente.id)
          .select('*')
          .single()
        if (error) throw error
        onAtualizado(data as Paciente)
      } else {
        atualizarRuntime(paciente.id, patch)
        onAtualizado({ ...paciente, ...patch })
      }

      pushToast({
        tipo: 'sucesso',
        titulo: 'Paciente atualizado',
        descricao: `Dados de ${patch.nome} salvos com sucesso.`,
      })
      onFechar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar'
      setErro(msg)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !salvando && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✏️ Editar paciente</DialogTitle>
          <DialogDescription className="text-xs">
            Matrícula, data de nascimento e sexo não podem ser alterados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Imutáveis para referência */}
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 grid grid-cols-3 gap-2">
            <div><span className="font-semibold">Matrícula</span><br />{paciente.matricula}</div>
            <div><span className="font-semibold">Nascimento</span><br />{new Date(paciente.data_nascimento).toLocaleDateString('pt-BR')}</div>
            <div><span className="font-semibold">Sexo</span><br />{paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Feminino' : 'Outro'}</div>
          </div>

          <div>
            <Label htmlFor="nome">Nome completo *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="setor">Setor</Label>
            <Input
              id="setor"
              value={form.setor}
              onChange={(e) => set('setor', e.target.value)}
              placeholder="Ex.: Manutenção, TI, RH"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="comorbidades">Comorbidades / Linhas relevantes</Label>
            <Input
              id="comorbidades"
              value={form.comorbidadesTxt}
              onChange={(e) => set('comorbidadesTxt', e.target.value)}
              placeholder="HAS, DM, OBE (separados por vírgula)"
              className="mt-1 font-mono text-xs"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Códigos curtos em maiúsculas. Para inserir uma nova linha de cuidado ativa, use o botão na aba Jornada.
            </p>
          </div>

          <div>
            <Label htmlFor="medicamentos">Medicamentos em uso</Label>
            <Textarea
              id="medicamentos"
              value={form.medicamentos_uso}
              onChange={(e) => set('medicamentos_uso', e.target.value)}
              rows={2}
              placeholder="Ex.: Losartana 50mg, Metformina 850mg"
              className="mt-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tab_status">Tabagismo</Label>
              <select
                id="tab_status"
                value={form.tabagismo_status}
                onChange={(e) => set('tabagismo_status', e.target.value as FormState['tabagismo_status'])}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="nunca">Nunca fumou</option>
                <option value="ex">Ex-fumante</option>
                <option value="atual">Fumante atual</option>
              </select>
            </div>
            <div>
              <Label htmlFor="macos_ano">Maços-ano</Label>
              <Input
                id="macos_ano"
                type="number"
                step="0.5"
                min="0"
                value={form.tabagismo_macos_ano}
                onChange={(e) => set('tabagismo_macos_ano', e.target.value)}
                disabled={form.tabagismo_status === 'nunca'}
                className="mt-1"
              />
            </div>
          </div>

          {erro && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {erro}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando} className="bg-blue-600 hover:bg-blue-500">
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
