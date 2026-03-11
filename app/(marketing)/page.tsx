import HeroSection from '@/components/marketing/HeroSection';
import MarqueeStrip from '@/components/marketing/MarqueeStrip';
import SectionBlock from '@/components/marketing/SectionBlock';
import MetricRow from '@/components/marketing/MetricRow';
import StepsTimeline from '@/components/marketing/StepsTimeline';
import CapabilityCards from '@/components/marketing/CapabilityCards';
import QuoteBlock from '@/components/marketing/QuoteBlock';
import CTASection from '@/components/marketing/CTASection';

export default function HomePage() {
  // S3: What we solve - Metrics
  const metrics = [
    { value: '70%', label: '리포트 제작시간 단축' },
    { value: '100%', label: '승인→공개로 납품 리스크 감소' },
    { value: '1:N', label: '프로젝트 단위 산출물 버전 관리' },
  ];

  // S4: How it works - Process Steps
  const steps = [
    { number: '1', title: '초안', description: '데이터 입력 및 AI 생성' },
    { number: '2', title: '검수', description: '내부 검토 및 수정' },
    { number: '3', title: '승인', description: '품질 확인 및 승인' },
    { number: '4', title: 'Published', description: '고객 공개 및 다운로드' },
  ];

  // S5: Capabilities - 4 Cards
  const capabilities = [
    {
      icon: '🔍',
      title: 'Keyword',
      description: '데이터 기반 키워드 분석',
      features: [
        '엑셀/JSON 업로드 기반',
        '분류·편집·메모 관리',
      ],
    },
    {
      icon: '📢',
      title: 'Ads',
      description: 'AI 광고 카피 생성',
      features: [
        '헤드라인/본문/CTA 자동 생성',
        '선택/보류/제외 관리',
      ],
    },
    {
      icon: '📊',
      title: 'Market',
      description: '시장조사 리포트 제작',
      features: [
        'Evidence 기반 근거 수집',
        'PDF 자동 생성 및 승인',
      ],
    },
    {
      icon: '🎨',
      title: 'Brand Identity',
      description: '브랜드아이덴티티 관리',
      features: [
        'PDF 버전 관리',
        '승인 플로우 및 공개',
      ],
    },
  ];

  return (
    <>
      {/* S1: Hero */}
      <HeroSection />

      {/* S2: Marquee Strip */}
      <MarqueeStrip />

      {/* S3: What we solve */}
      <SectionBlock
        id="problem"
        title="무엇을 해결하는가"
        description="브루션은 산출물 제작 프로세스의 비효율을 제거하고, 승인-공개 체계로 납품 품질을 보장합니다."
      >
        <MetricRow metrics={metrics} />
      </SectionBlock>

      {/* S4: How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              어떻게 작동하는가
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              초안부터 published 공개까지, 명확한 4단계 프로세스로 품질을 관리합니다.
            </p>
          </div>
          <StepsTimeline steps={steps} />
          
          {/* Published-only 설명 */}
          <div className="mt-12 text-center max-w-2xl mx-auto">
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-brution-blue">Published 상태</strong>만 고객이 다운로드하고 열람할 수 있습니다.
              <br />
              초안·검수·승인 단계는 내부 작업용이며, 승인 완료 후 StaffAdmin이 published로 전환해야 고객에게 공개됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* S5: Capabilities */}
      <SectionBlock
        id="capabilities"
        title="핵심 기능"
        description="키워드·광고·시장조사·브랜드아이덴티티, 4가지 산출물을 하나의 플랫폼에서 관리합니다."
      >
        <CapabilityCards capabilities={capabilities} />
      </SectionBlock>

      {/* S6: Quote */}
      <QuoteBlock
        quote="브루션의 목표는 단순합니다. 다양한 조각이 만나 하나의 완성된 브랜드를 이룹니다."
        author="Brution"
      />

      {/* S7: CTA */}
      <CTASection />
    </>
  );
}
