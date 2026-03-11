interface SectionBlockProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  id?: string;
}

export default function SectionBlock({ title, description, children, id }: SectionBlockProps) {
  return (
    <section id={id} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {description}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}
