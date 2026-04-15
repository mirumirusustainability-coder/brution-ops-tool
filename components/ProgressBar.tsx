'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function ProgressBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const prevPathname = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setVisible(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), 600)
    }
    return () => clearTimeout(timerRef.current)
  }, [pathname])

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="h-full w-full origin-left"
        style={{
          background: '#378ADD',
          animation: visible ? 'progress-slide 0.6s ease-out forwards' : 'none',
        }}
      />
      <style>{`
        @keyframes progress-slide {
          0% { transform: scaleX(0); }
          60% { transform: scaleX(0.8); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}
