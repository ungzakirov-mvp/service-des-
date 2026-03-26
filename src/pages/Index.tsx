import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustIndicators from "@/components/TrustIndicators";
import Services from "@/components/Services";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import ClientsMarquee from "@/components/ClientsMarquee";
import Partners from "@/components/Partners";
import SEOHead from "@/components/SEOHead";
import SeoTextBlock, { SeoLink } from "@/components/SeoTextBlock";
import { useVisitTracker } from "@/hooks/useVisitTracker";

const BASE = "https://novumtech.uz";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Novum Tech",
  url: BASE,
  logo: `${BASE}/logo.png`,
  contactPoint: { "@type": "ContactPoint", telephone: "+998-99-998-17-77", contactType: "customer service", areaServed: "UZ", availableLanguage: ["ru", "uz", "en"] },
  address: { "@type": "PostalAddress", addressLocality: "Ташкент", addressCountry: "UZ" },
  sameAs: [],
};

const Index = () => {
  useVisitTracker();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="IT аутсорсинг Ташкент — IT услуги для бизнеса | Novum Tech"
        description="IT аутсорсинг в Ташкенте от Novum Tech. Обслуживание компьютеров, серверов, сетей, внедрение CRM, service desk. SLA 99.9%, реакция до 30 минут. IT компания Ташкент."
        canonical={`${BASE}/`}
        jsonLd={jsonLd}
      />
      <Navbar />
      <main>
        <Hero />
        <TrustIndicators />
        <Services />
        <Partners />
        <ClientsMarquee />
        <Pricing />
      </main>

      <SeoTextBlock>
        <h2>IT аутсорсинг в Ташкенте — комплексное обслуживание IT-инфраструктуры</h2>
        <p>
          Novum Tech — IT компания в Ташкенте, предоставляющая полный спектр IT услуг для бизнеса. Мы специализируемся на IT аутсорсинге для компаний от 5 до 150 рабочих мест и помогаем предприятиям сосредоточиться на основной деятельности, передав обслуживание IT-инфраструктуры профессионалам.
        </p>
        <h3>Обслуживание компьютеров и серверов в Ташкенте</h3>
        <p>
          Наши <SeoLink to="/services">IT услуги в Ташкенте</SeoLink> включают обслуживание компьютеров, ноутбуков, серверного оборудования, а также настройку и поддержку сетевой инфраструктуры. Мы обеспечиваем бесперебойную работу вашего бизнеса с гарантией SLA 99.9% и временем реакции до 30 минут.
        </p>
        <h3>Внедрение CRM и автоматизация бизнес-процессов</h3>
        <p>
          Помимо технической поддержки, мы предлагаем внедрение CRM в Узбекистане, автоматизацию бизнес-процессов и настройку <SeoLink to="/service-desk">service desk в Ташкенте</SeoLink>. Это позволяет нашим клиентам повысить эффективность работы сотрудников и улучшить качество обслуживания.
        </p>
        <h3>Прозрачные тарифы IT обслуживания</h3>
        <p>
          Мы предлагаем <SeoLink to="/constructor">гибкий конструктор тарифов</SeoLink>, где вы можете собрать план обслуживания под потребности вашей компании. Фиксированная ежемесячная стоимость, договор и отчётность — всё прозрачно и понятно. Узнайте больше <SeoLink to="/about">о нашей компании</SeoLink> и подходе к работе.
        </p>
        <p>
          Есть вопросы? Загляните в <SeoLink to="/faq">раздел FAQ</SeoLink> или <SeoLink to="/contacts">свяжитесь с нами</SeoLink> для бесплатной консультации. IT аутсорсинг Ташкент — доверьте IT профессионалам Novum Tech.
        </p>
      </SeoTextBlock>

      <Footer />
    </div>
  );
};

export default Index;
