import SectionBlock from '@/components/marketing/SectionBlock';
import StepsTimeline from '@/components/marketing/StepsTimeline';
import CTASection from '@/components/marketing/CTASection';

export default function ServicePage() {
  // Process Steps (재사용)
  const steps = [
    { number: '1', title: '초안', description: '데이터 입력 및 AI 생성' },
    { number: '2', title: '검수', description: '내부 검토 및 수정' },
    { number: '3', title: '승인', description: '품질 확인 및 승인' },
    { number: '4', title: 'Published', description: '고객 공개 및 다운로드' },
  ];

  // 4 Capabilities 상세
  const capabilities = [
    {
      title: 'Keyword Analysis',
      subtitle: '키워드 분석',
      what: '엑셀/JSON 업로드를 기반으로 키워드를 자동 분류하고 분석합니다.',
      why: '수작업 분류 시간을 70% 단축하고, 데이터 기반 의사결정을 지원합니다.',
      output: '분류·검색량·상품수를 포함한 엑셀 산출물 (고객 편집 가능)',
      gradient: 'from-brution-blue to-brution-mint',
    },
    {
      title: 'Ads Copy Generation',
      subtitle: '광고 카피 생성',
      what: '캠페인 정보 입력 시 AI가 헤드라인, 본문, CTA, 소재 아이디어를 자동 생성합니다.',
      why: '광고 기획 시간을 단축하고, 다양한 카피 옵션을 빠르게 확보합니다.',
      output: '헤드라인/본문/후킹/CTA/소재 포함 엑셀 산출물 (선택/보류/제외 관리)',
      gradient: 'from-brution-mint to-brution-blue',
    },
    {
      title: 'Market Research',
      subtitle: '시장조사 리포트',
      what: 'Evidence(근거) 수집 후 AI가 시장조사 초안을 작성하고 PDF로 렌더링합니다.',
      why: '리포트 제작 시간을 단축하고, 근거 기반 신뢰도를 확보합니다.',
      output: 'PDF 리포트 (Appendix에 근거 자동 삽입, 내부 전용)',
      gradient: 'from-brution-blue via-brution-mint to-brution-lime',
    },
    {
      title: 'Brand Identity Management',
      subtitle: '브랜드아이덴티티 관리',
      what: 'PDF 파일을 업로드하고 버전·승인·공개를 체계적으로 관리합니다.',
      why: '브랜드 가이드라인을 명확히 전달하고, 버전 이력을 추적합니다.',
      output: 'PDF 브랜드아이덴티티 가이드 (로고/컬러/타이포/사용 예시)',
      gradient: 'from-brution-lime to-brution-mint',
    },
  ];

  // FAQ
  const faqs = [
    {
      question: 'Published 상태는 무엇인가요?',
      answer: 'Published는 내부 승인이 완료되어 고객이 다운로드·열람할 수 있는 최종 상태입니다. 초안·검수·승인 단계는 내부 작업용이며, StaffAdmin만 published로 전환할 수 있습니다.',
    },
    {
      question: '고객이 직접 가입할 수 있나요?',
      answer: '아니요. 브루션은 발급형 계정 시스템입니다. StaffAdmin이 고객사와 사용자를 생성하고 임시 비밀번호를 전달합니다. 고객은 첫 로그인 시 비밀번호를 변경합니다.',
    },
    {
      question: '한 프로젝트에 여러 산출물을 관리할 수 있나요?',
      answer: '네. 브루션은 프로젝트 단위로 키워드·광고·시장조사·브랜드아이덴티티를 통합 관리합니다. 각 산출물은 독립적인 버전과 상태를 가집니다.',
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            서비스 소개
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            키워드·광고·시장조사·브랜드아이덴티티, 4가지 산출물을 하나의 프로세스로 관리합니다.
          </p>
        </div>
      </section>

      {/* 4 Capabilities 상세 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {capabilities.map((cap, index) => (
              <div
                key={index}
                className={`p-8 bg-white rounded-2xl shadow-sm border border-gray-200 ${
                  index % 2 === 0 ? '' : 'md:ml-auto md:mr-0'
                } max-w-4xl`}
              >
                {/* Gradient Accent */}
                <div className={`w-20 h-1 bg-gradient-to-r ${cap.gradient} mb-6`}></div>

                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {cap.title}
                </h2>
                <p className="text-lg text-gray-600 mb-6">{cap.subtitle}</p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-brution-blue mb-2">무엇을 하는가</h3>
                    <p className="text-gray-700">{cap.what}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-brution-blue mb-2">왜 필요한가</h3>
                    <p className="text-gray-700">{cap.why}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-brution-blue mb-2">산출물</h3>
                    <p className="text-gray-700">{cap.output}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process (재노출) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              프로세스
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              초안→검수→승인→published, 명확한 4단계로 품질을 보장합니다.
            </p>
          </div>
          <StepsTimeline steps={steps} />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            자주 묻는 질문
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Q. {faq.question}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  A. {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection />
    </>
  );
}
