import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import About from "@/components/About";
import Workflow from "@/components/Workflow";
import ScrollReveal from "@/components/ScrollReveal";
import SEOHead from "@/components/SEOHead";
import SeoTextBlock, { SeoLink } from "@/components/SeoTextBlock";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="IT компания Ташкент — о Novum Tech | IT аутсорсинг Узбекистан" description="Novum Tech — IT компания в Ташкенте. Опытная команда, прозрачные процессы, SLA 99.9%. IT аутсорсинг, обслуживание компьютеров, внедрение CRM в Узбекистане." canonical="https://novumtech.uz/about" />
      <Navbar />
      <main className="pt-16">
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--primary)/0.06),transparent_70%)]" />
          <div className="container mx-auto px-4 lg:px-8 relative">
            <ScrollReveal>
              <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-4">{t("nav.about")}</p>
              <h1 className="text-4xl lg:text-[3.25rem] font-bold text-foreground mb-14 leading-[1.1]">{t("about.title")}</h1>
            </ScrollReveal>
          </div>
        </section>
        <About />
        <Workflow />
      </main>

      <SeoTextBlock>
        <h2>IT компания в Ташкенте — почему выбирают Novum Tech</h2>
        <p>
          Novum Tech — это IT компания в Ташкенте с опытом комплексного обслуживания IT-инфраструктуры для бизнеса. Мы предоставляем IT аутсорсинг в Ташкенте для компаний от 5 до 150 рабочих мест, обеспечивая стабильную работу всех систем без необходимости содержать штатный IT-отдел.
        </p>
        <h3>Наш подход к IT обслуживанию</h3>
        <p>
          В основе нашей работы — прозрачность и предсказуемость. Каждый клиент получает договор с чётким SLA, фиксированную стоимость обслуживания и регулярную отчётность. Наш <SeoLink to="/service-desk">service desk</SeoLink> принимает заявки 24/7, а время реакции составляет до 30 минут.
        </p>
        <h3>Комплексные IT услуги</h3>
        <p>
          Мы не просто чиним компьютеры — мы выстраиваем IT-процессы. Обслуживание компьютеров в Ташкенте, настройка серверов, монтаж СКС, внедрение CRM в Узбекистане и автоматизация бизнес-процессов — всё это входит в наш <SeoLink to="/services">каталог IT услуг</SeoLink>. Рассчитайте стоимость в <SeoLink to="/constructor">конструкторе тарифов</SeoLink>.
        </p>
      </SeoTextBlock>

      <Footer />
    </div>
  );
}
