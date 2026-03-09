// Snackbar通知システム
// デザインシステム: OeZYr(Default), po45K(Success), 0jXla(Error), T2tUR(Warning)

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// --- 型定義 ---

type ToastVariant = 'success' | 'error' | 'warning' | 'default'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  dismissing: boolean
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'DISMISS'; id: string }
  | { type: 'REMOVE'; id: string }

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

// --- アイコンマップ ---

const ICON_MAP = {
  default: { icon: Info, className: 'text-foreground' },
  success: { icon: CircleCheck, className: 'text-[#16a34a]' },
  error: { icon: CircleX, className: 'text-destructive' },
  warning: { icon: TriangleAlert, className: 'text-[#d97706]' },
} as const

// --- Reducer ---

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast]
    case 'DISMISS':
      return state.map((t) =>
        t.id === action.id ? { ...t, dismissing: true } : t,
      )
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id)
  }
}

// --- Context ---

const ToastContext = createContext<ToastContextValue | null>(null)

// --- ToastItem ---

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const { icon: Icon, className: iconClass } = ICON_MAP[t.variant]

  // 各トースト個別の自動消去タイマー（他のトースト追加でリセットされない）
  useEffect(() => {
    if (t.dismissing) return
    const timer = setTimeout(() => onDismiss(t.id), 3000)
    return () => clearTimeout(timer)
  }, [t.id, t.dismissing, onDismiss])

  return (
    <div
      className={cn(
        'flex w-100 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-[0_4px_12px_-2px_#00000014]',
        'max-md:w-auto max-md:left-4 max-md:right-4',
        t.dismissing
          ? 'animate-[toast-fade-out_200ms_ease-in_forwards]'
          : 'animate-[toast-slide-in_300ms_ease-out]',
      )}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon className={cn('h-4 w-4', iconClass)} />
      </div>
      <p className="min-w-0 flex-1 text-sm text-foreground">{t.message}</p>
      <button
        type="button"
        className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center"
        onClick={() => onDismiss(t.id)}
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}

// --- Toaster (Portal) ---

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-100 flex flex-col gap-2 max-md:left-4">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  )
}

// --- Provider ---

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, [])

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'DISMISS', id })
    setTimeout(() => dispatch({ type: 'REMOVE', id }), 200)
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'default') => {
      const id = `toast-${++toastCounter}`
      dispatch({
        type: 'ADD',
        toast: { id, message, variant, dismissing: false },
      })
    },
    [],
  )

  const contextValue = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// --- Hook ---

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
