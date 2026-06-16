'use client'

import { useCallback } from 'react'
import { toast as sonnerToast } from 'sonner'

export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  message: string
  type: ToastType
}

/**
 * sonner 어댑터. 기존 showToast(message, type) 시그니처를 유지해
 * 호출부를 수정하지 않고 토스트만 sonner로 전환한다.
 * 실제 렌더링은 <ToastContainer/>(= sonner <Toaster/>)가 담당.
 */
export const showToast = (message: string, type: ToastType = 'info') => {
  if (type === 'success') sonnerToast.success(message)
  else if (type === 'error') sonnerToast.error(message)
  else sonnerToast(message)
}

export const useToast = () => {
  const show = useCallback((message: string, type: ToastType = 'info') => {
    showToast(message, type)
  }, [])

  // toasts/removeToast는 하위호환용(이제 sonner가 렌더링하므로 빈 배열)
  return { toasts: [] as ToastItem[], showToast: show, removeToast: (_id: string) => {} }
}
