'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Main Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
          브랜드를 완성하는
          <br />
          <span className="text-brution-blue">하나의 프로세스</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          키워드·광고·시장조사·브랜드아이덴티티를 하나의 프로세스로 묶어 실행
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link
            href="/contact"
            className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-brution-blue rounded-lg hover:bg-[#0D5FE6] transition-all shadow-lg hover:shadow-xl"
          >
            상담 요청하기
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-brution-blue bg-white border-2 border-brution-blue rounded-lg hover:bg-blue-50 transition-all"
          >
            로그인
          </Link>
        </div>

        {/* Scroll Down Indicator */}
        <div className="flex flex-col items-center gap-2 animate-scroll-indicator">
          <span className="text-sm text-gray-400 font-medium">Scroll down</span>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Gradient Accent (subtle, bottom of hero) */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-brution-gradient"></div>
    </section>
  );
}
