'use client'

import { Toaster } from '@/components/ui/sonner'

/**
 * 기존 호출부 호환을 위해 이름은 유지하되, 내부는 sonner Toaster로 전환.
 * 라우트당 한 번 렌더되므로 중복 마운트되지 않는다.
 */
export function ToastContainer() {
  return <Toaster position="bottom-right" richColors closeButton />
}
