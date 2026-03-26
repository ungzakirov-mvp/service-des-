import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import ScrollReveal from "@/components/ScrollReveal";
import SEOHead from "@/components/SEOHead";
import SeoTextBlock, { SeoLink } from "@/components/SeoTextBlock";
import { useLanguage } from "@/i18n/LanguageContext";

export default function FAQPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="FAQ — вопросы об IT аутсорсинге Ташкент | Novum Tech" description="Ответы на частые вопросы об IT аутсорсинге в Ташкенте: SLA, тарифы, service desk, обслуживание компьютеров. IT компания Novum Tech — всё прозрачно." canonical="https://novumtech.uz/faq" />
      <Navbar />
      <main className="pt-16">
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--primary)/0.06),transparent_70%)]" />
          <div className="container mx-auto px-4 lg:px-8 max-w-3xl relative">
            <ScrollReveal>
              <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-4">FAQ</p>
              <h1 className="text-4xl lg:text-[3.25rem] font-bold text-foreground mb-14 leading-[1.1]">{t("faq.title")}</h1>
            </ScrollReveal>
            <FAQ />
          </div>
        </section>
      </main>

      <SeoTextBlock>
        <h2>Частые вопросы об IT аутсорсинге в Ташкенте</h2>
        <p>
          Выбор IT компании в Ташкенте — важное решение для бизнеса. В этом разделе мы собрали ответы на самые частые вопросы об IT аутсорсинге, чтобы вы могли принять взвешенное решение. Novum Tech работает по договору с фиксированным SLA и прозрачной отчётностью.
        </p>
        <h3>Как работает IT аутсорсинг?</h3>
        <p>
          IT аутсорсинг в Ташкенте от Novum Tech — это передача обслуживания IT-инфраструктуры внешней команде профессионалов. Вы получаете обслуживание компьютеров, серверов, сетей, <SeoLink to="/service-desk">service desk</SeoLink> и техническую поддержку по фиксированной ежемесячной стоимости без необходимости содержать штатных IT-специалистов.
        </p>
        <h3>Что входит в IT обслуживание?</h3>
        <p>
          В зависимости от выбранного тарифа, IT обслуживание может включать: поддержку рабочих мест, администрирование серверов, монтаж СКС, настройку сетевого оборудования и внедрение CRM в Узбекистане. Ознакомьтесь с полным <SeoLink to="/services">каталогом IT услуг</SeoLink> или <SeoLink to="/constructor">соберите свой тариф</SeoLink> в конструкторе.
        </p>
      </SeoTextBlock>

      <Footer />
    </div>
  );
}
