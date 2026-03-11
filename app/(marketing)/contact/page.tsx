'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission (no backend)
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-brution-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-brution-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            문의가 접수되었습니다
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            빠른 시일 내에 담당자가 연락드리겠습니다.
            <br />
            (이 페이지는 목업입니다. 실제 제출은 되지 않습니다.)
          </p>

          <button
            onClick={() => setSubmitted(false)}
            className="px-6 py-3 text-base font-medium text-brution-blue border-2 border-brution-blue rounded-lg hover:bg-blue-50 transition-colors"
          >
            새 문의 작성
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            문의하기
          </h1>
          <p className="text-lg sm:text-xl text-gray-600">
            브루션 도입이나 서비스에 대해 궁금한 점을 남겨주세요.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="pb-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                이름 *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brution-blue focus:border-transparent outline-none transition-all"
                placeholder="홍길동"
              />
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-900 mb-2">
                회사명 *
              </label>
              <input
                type="text"
                id="company"
                name="company"
                required
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brution-blue focus:border-transparent outline-none transition-all"
                placeholder="(주)브루션"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                이메일 *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brution-blue focus:border-transparent outline-none transition-all"
                placeholder="contact@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                연락처 *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brution-blue focus:border-transparent outline-none transition-all"
                placeholder="010-1234-5678"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                문의내용 *
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brution-blue focus:border-transparent outline-none transition-all resize-none"
                placeholder="브루션 도입이나 서비스에 대해 궁금한 점을 자유롭게 작성해주세요."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full px-8 py-4 text-base font-semibold text-white bg-brution-blue rounded-lg hover:bg-[#0D5FE6] transition-all shadow-lg hover:shadow-xl"
            >
              문의 제출하기
            </button>
          </form>

          {/* Contact Info */}
          <div className="mt-12 p-6 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-3">또는 직접 연락주세요</p>
            <div className="space-y-2">
              <p className="text-base font-medium text-gray-900">
                📧 contact@brution.com
              </p>
              <p className="text-base font-medium text-gray-900">
                📞 02-1234-5678
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
