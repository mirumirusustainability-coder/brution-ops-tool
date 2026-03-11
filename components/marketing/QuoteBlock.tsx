interface QuoteBlockProps {
  quote: string;
  author?: string;
}

export default function QuoteBlock({ quote, author }: QuoteBlockProps) {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Gradient Accent Line */}
        <div className="w-24 h-1 bg-brution-gradient mx-auto mb-8"></div>
        
        {/* Quote */}
        <blockquote className="text-2xl sm:text-3xl font-medium text-gray-900 leading-relaxed mb-6">
          "{quote}"
        </blockquote>

        {/* Author */}
        {author && (
          <p className="text-base text-gray-600">
            — {author}
          </p>
        )}
      </div>
    </section>
  );
}
