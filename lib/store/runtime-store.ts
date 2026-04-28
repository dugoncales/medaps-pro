'use client'

// MedAPS Pro — Runtime Store
//
// Em modo demo (sem Supabase configurado) usamos zustand + localStorage
// para persistir entidades criadas em runtime: pacientes, linhas de
// cuidado e aplicações de escalas ICHOM. Quando Supabase estiver ativo,
// as actions delegam o insert e mantêm uma cópia local apenas para UI.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Paciente, LinhaCuidado } from '@/types'
import type { EscalaCodigo, ResultadoEscala } from '@/lib/escalas/ichom'

export interface AplicacaoEscala {
  id: string
  paciente_id: string
  consulta_id?: string
  codigo: EscalaCodigo
  resultado: ResultadoEscala
  profissional_nome: string
  data: string
}

interface RuntimeState {
  pacientes: Paciente[]
  linhas: LinhaCuidado[]
  escalas: AplicacaoEscala[]

  adicionarPaciente: (p: Paciente) => void
  atualizarPaciente: (id: string, patch: Partial<Paciente>) => void
  adicionarLinha: (l: LinhaCuidado) => void
  adicionarEscala: (e: AplicacaoEscala) => void

  pacientesPorEmpresa: (empresa_id: string) => Paciente[]
  linhasPorPaciente: (paciente_id: string) => LinhaCuidado[]
  escalasPorPaciente: (paciente_id: string) => AplicacaoEscala[]
}

export const useRuntimeStore = create<RuntimeState>()(
  persist(
    (set, get) => ({
      pacientes: [],
      linhas: [],
      escalas: [],

      adicionarPaciente: (p) =>
        set((s) => ({ pacientes: [...s.pacientes, p] })),

      atualizarPaciente: (id, patch) =>
        set((s) => ({
          pacientes: s.pacientes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      adicionarLinha: (l) =>
        set((s) => ({ linhas: [...s.linhas, l] })),

      adicionarEscala: (e) =>
        set((s) => ({ escalas: [...s.escalas, e] })),

      pacientesPorEmpresa: (empresa_id) =>
        get().pacientes.filter((p) => p.empresa_id === empresa_id),

      linhasPorPaciente: (paciente_id) =>
        get().linhas.filter((l) => l.paciente_id === paciente_id),

      escalasPorPaciente: (paciente_id) =>
        get().escalas.filter((e) => e.paciente_id === paciente_id),
    }),
    {
      name: 'medaps-runtime',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)

// Gera ID estável (não criptográfico — apenas para demo)
export function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
