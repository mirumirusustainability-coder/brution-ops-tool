interface Capability {
  icon: string;
  title: string;
  description: string;
  features: string[];
}

interface CapabilityCardsProps {
  capabilities: Capability[];
}

export default function CapabilityCards({ capabilities }: CapabilityCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {capabilities.map((capability, index) => (
        <div
          key={index}
          className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-brution-blue hover:shadow-lg transition-all group"
        >
          {/* Icon */}
          <div className="w-12 h-12 mb-4 text-3xl">
            {capability.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-brution-blue transition-colors">
            {capability.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4">
            {capability.description}
          </p>

          {/* Features */}
          <ul className="space-y-2">
            {capability.features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start text-sm text-gray-700">
                <span className="text-brution-mint mr-2">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
