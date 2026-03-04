import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brution 운영지원툴',
  description: '브루션 데이터로 더 똑똑해진 생성형 AI - 운영지원 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
