interface Metric {
  value: string;
  label: string;
}

interface MetricRowProps {
  metrics: Metric[];
}

export default function MetricRow({ metrics }: MetricRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {metrics.map((metric, index) => (
        <div key={index} className="text-center p-8 bg-gray-50 rounded-lg">
          <div className="text-4xl font-bold text-brution-blue mb-2">
            {metric.value}
          </div>
          <div className="text-base text-gray-700">
            {metric.label}
          </div>
        </div>
      ))}
    </div>
  );
}
