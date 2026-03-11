'use client';

export default function MarqueeStrip({ text }: { text?: string }) {
  const defaultText = 'BRUTION • KEYWORD • ADS • MARKET • BRAND IDENTITY • APPROVE • PUBLISH';
  const displayText = text || defaultText;

  return (
    <div className="relative overflow-hidden bg-brution-blue py-6">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Duplicate text for seamless loop */}
        <span className="inline-block text-white font-bold text-2xl px-8">
          {displayText}
        </span>
        <span className="inline-block text-white font-bold text-2xl px-8">
          {displayText}
        </span>
        <span className="inline-block text-white font-bold text-2xl px-8">
          {displayText}
        </span>
        <span className="inline-block text-white font-bold text-2xl px-8">
          {displayText}
        </span>
      </div>
    </div>
  );
}
