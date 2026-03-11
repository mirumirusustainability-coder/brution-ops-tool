import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 relative">
                <div className="absolute top-0 left-0 w-3 h-3 bg-brution-blue rounded-sm"></div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-brution-blue rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-6 h-3 bg-brution-blue rounded-full"></div>
              </div>
              <span className="text-lg font-bold text-gray-900">Brution</span>
              <span className="text-xs text-gray-500">by Mirumiru</span>
            </div>
            <p className="text-sm text-gray-600 max-w-sm">
              키워드·광고·시장조사·브랜드아이덴티티를<br />
              하나의 프로세스로 묶어 실행하는<br />
              운영지원 플랫폼
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">바로가기</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-gray-600 hover:text-brution-blue transition-colors">
                  홈
                </Link>
              </li>
              <li>
                <Link href="/service" className="text-sm text-gray-600 hover:text-brution-blue transition-colors">
                  서비스
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 hover:text-brution-blue transition-colors">
                  문의
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-gray-600 hover:text-brution-blue transition-colors">
                  로그인
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="text-sm text-gray-600">
                이메일: contact@brution.com
              </li>
              <li className="text-sm text-gray-600">
                전화: 02-1234-5678
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} Brution by Mirumiru. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
