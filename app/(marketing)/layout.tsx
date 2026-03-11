import type { Metadata } from 'next';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Brution - 브랜드를 완성하는 하나의 프로세스',
  description: '키워드·광고·시장조사·브랜드아이덴티티를 하나의 프로세스로 묶어 실행하는 운영지원 플랫폼',
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen">
        {children}
      </main>
      <MarketingFooter />
    </>
  );
}
