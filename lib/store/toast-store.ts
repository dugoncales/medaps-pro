'use client'

// MedAPS Pro — Toast store (zustand, in-memory).
//
// Não persiste. Usado para feedback imediato após salvar escalas,
// detectar respostas remotas críticas via realtime, etc.

import { create } from 'zustand'

export type ToastTipo = 'info' | 'sucesso' | 'aviso' | 'critico'

export interface Toast {
  id: string
  tipo: ToastTipo
  titulo: string
  descricao?: string
  /** ms; default 6000. Use 0 para fixo até o usuário fechar */
  duracao?: number
  /** Ação inline (ex.: "Desfazer"). Ao clicar, executa onClick e dispensa o toast. */
  acao?: { label: string; onClick: () => void | Promise<void> }
}

interface ToastStore {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    const toast: Toast = { ...t, id }
    set((s) => ({ toasts: [...s.toasts, toast] }))
    const dur = t.duracao ?? 6000
    if (dur > 0) {
      setTimeout(() => get().dismiss(id), dur)
    }
    return id
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
