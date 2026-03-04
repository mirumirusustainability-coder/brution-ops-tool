import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Brution</h1>
        <p className="text-gray-600 mb-8">
          데이터로 더 똑똑해진 생성형 AI
          <br />
          운영지원 플랫폼
        </p>
        <Link
          href="/login"
          className="inline-block bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-primary-hover transition-colors"
        >
          로그인하기
        </Link>
      </div>
    </div>
  );
}
