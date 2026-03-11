interface Step {
  number: string;
  title: string;
  description: string;
}

interface StepsTimelineProps {
  steps: Step[];
}

export default function StepsTimeline({ steps }: StepsTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
        {steps.map((step, index) => (
          <div key={index} className="text-center">
            {/* Step Number Circle */}
            <div className="relative inline-flex items-center justify-center w-16 h-16 bg-brution-blue text-white font-bold text-xl rounded-full mb-4 z-10">
              {step.number}
            </div>
            
            {/* Step Content */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-gray-600">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Published Badge */}
      <div className="mt-12 text-center">
        <div className="inline-block px-6 py-3 bg-gradient-to-r from-brution-blue via-brution-mint to-brution-lime text-white font-bold rounded-full shadow-lg">
          PUBLISHED: 고객 공개 완료
        </div>
      </div>
    </div>
  );
}
