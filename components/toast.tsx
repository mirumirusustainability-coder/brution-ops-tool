'use client'

/**
 * 토스트는 이제 AppLayout이 sonner <Toaster/>를 한 번만 마운트한다.
 * 기존 페이지들이 <ToastContainer/>를 렌더해도 중복되지 않도록 no-op 유지.
 */
export function ToastContainer() {
  return null
}
