'use client'

import { BarChart2, Lightbulb, Package, Palette, Search } from 'lucide-react'

const steps = [
  { label: '스타터 패키지', icon: Search },
  { label: '브랜드 기획', icon: Lightbulb },
  { label: '디자인·인증', icon: Palette },
  { label: '생산·납품', icon: Package },
  { label: '출시', icon: BarChart2 },
]

type StepProgressProps = {
  currentStep: number
  onStepChange?: (step: number) => void
  readonly?: boolean
}

export function StepProgress({ currentStep, onStepChange, readonly = true }: StepProgressProps) {
  const safeStep = Number.isFinite(currentStep)
    ? Math.min(4, Math.max(0, currentStep))
    : 0

  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isCompleted = index < safeStep
        const isCurrent = index === safeStep

        const circleClass = isCurrent
          ? 'bg-blue-600 text-white'
          : isCompleted
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-400'

        const labelClass = isCurrent
          ? 'text-blue-700 font-bold'
          : isCompleted
            ? 'text-blue-600'
            : 'text-gray-400'

        const lineClass = index < safeStep ? 'bg-blue-500' : 'bg-gray-200'

        return (
          <div key={step.label} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => {
                if (!readonly) {
                  onStepChange?.(index)
                }
              }}
              disabled={readonly}
              className="flex flex-col items-center gap-1 text-center disabled:cursor-default"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${circleClass}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span className={`text-sm font-semibold ${labelClass}`}>STEP {index}</span>
              <span className={`text-xs ${labelClass}`}>{step.label}</span>
              {isCurrent && (
                <span className="mt-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
                  진행중
                </span>
              )}
            </button>
            {index < steps.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 ${lineClass}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
