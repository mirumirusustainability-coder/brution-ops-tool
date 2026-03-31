'use client'

import { useCallback, useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  message: string
  type: ToastType
}

let toasts: ToastItem[] = []
let listeners: Array<(items: ToastItem[]) => void> = []

const emit = () => {
  listeners.forEach((listener) => listener(toasts))
}

const removeToast = (id: string) => {
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

const addToast = (message: string, type: ToastType = 'info') => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  toasts = [...toasts, { id, message, type }]
  emit()
  setTimeout(() => removeToast(id), 3000)
}

export const useToast = () => {
  const [items, setItems] = useState<ToastItem[]>(toasts)

  useEffect(() => {
    listeners.push(setItems)
    return () => {
      listeners = listeners.filter((listener) => listener !== setItems)
    }
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    addToast(message, type)
  }, [])

  return { toasts: items, showToast, removeToast }
}
