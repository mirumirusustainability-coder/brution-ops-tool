'use client'

import { useToast } from '@/hooks/use-toast'

const typeStyles = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item px-4 py-3 rounded-md shadow-lg text-sm font-medium ${typeStyles[toast.type]}`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
      <style jsx>{`
        @keyframes toastFade {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          10% {
            opacity: 1;
            transform: translateY(0);
          }
          90% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(8px);
          }
        }
        .toast-item {
          animation: toastFade 3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
