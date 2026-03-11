import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="py-20 bg-brution-blue">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          브루션과 함께 시작하세요
        </h2>
        <p className="text-lg text-blue-100 mb-10">
          프로젝트 관리부터 산출물 승인까지, 체계적인 프로세스를 경험하세요
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/contact"
            className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-brution-blue bg-white rounded-lg hover:bg-gray-100 transition-all shadow-lg"
          >
            상담 요청하기
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-transparent border-2 border-white rounded-lg hover:bg-white/10 transition-all"
          >
            로그인
          </Link>
        </div>

        {/* Contact Info */}
        <div className="mt-12 pt-8 border-t border-blue-400/30">
          <p className="text-blue-100 text-sm mb-2">문의</p>
          <p className="text-white font-medium">contact@brution.com · 02-1234-5678</p>
        </div>
      </div>
    </section>
  );
}
