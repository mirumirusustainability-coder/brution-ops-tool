'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center">
              {/* Brution Symbol (simplified geometric) */}
              <div className="w-8 h-8 mr-2 relative">
                <div className="absolute top-0 left-0 w-3 h-3 bg-brution-blue rounded-sm"></div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-brution-blue rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-6 h-3 bg-brution-blue rounded-full"></div>
              </div>
              <span className="text-xl font-bold text-gray-900">Brution</span>
              <span className="text-xs text-gray-500 ml-1">by Mirumiru</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-brution-blue transition-colors">
              홈
            </Link>
            <Link href="/service" className="text-sm font-medium text-gray-700 hover:text-brution-blue transition-colors">
              서비스
            </Link>
            <Link href="/contact" className="text-sm font-medium text-gray-700 hover:text-brution-blue transition-colors">
              문의
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-brution-blue rounded-md hover:bg-[#0D5FE6] transition-colors"
            >
              로그인
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-gray-100">
            <Link href="/" className="block py-2 text-sm font-medium text-gray-700">
              홈
            </Link>
            <Link href="/service" className="block py-2 text-sm font-medium text-gray-700">
              서비스
            </Link>
            <Link href="/contact" className="block py-2 text-sm font-medium text-gray-700">
              문의
            </Link>
            <Link
              href="/login"
              className="block w-full px-4 py-2 text-sm font-medium text-white bg-brution-blue rounded-md text-center"
            >
              로그인
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
