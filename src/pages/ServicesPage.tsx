import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import ScrollReveal from '@/components/ScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import SeoTextBlock, { SeoLink } from '@/components/SeoTextBlock';
import { Server, Headphones, Database, Wifi, Printer, ClipboardCheck } from 'lucide-react';

const iconMap: Record<string, any> = { Server, Headphones, Database, Wifi, Printer, ClipboardCheck };

export default function ServicesPage() {
  const { lang, t } = useLanguage();

  const { data: categories } = useQuery({
    queryKey: ['service-categories-page'],
    queryFn: async () => {
      const { data } = await supabase.from('service_categories').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const getLabel = (cat: any) => {
    if (lang === 'uz') return cat.label_uz || cat.label_ru;
    if (lang === 'en') return cat.label_en || cat.label_ru;
    return cat.label_ru;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="IT услуги Ташкент — обслуживание компьютеров и серверов | Novum Tech" description="IT услуги в Ташкенте: обслуживание компьютеров, серверов, монтаж СКС, внедрение CRM, service desk. IT компания Novum Tech — полный спектр IT аутсорсинга." canonical="https://novumtech.uz/services" />
      <Navbar />
      <main className="pt-16">
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--primary)/0.06),transparent_70%)]" />
          <div className="container mx-auto px-4 lg:px-8 relative">
            <ScrollReveal>
              <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-4">Services</p>
              <h1 className="text-4xl lg:text-[3.25rem] font-bold text-foreground mb-5 leading-[1.1]">{t("services.title")}</h1>
              <p className="text-lg text-muted-foreground mb-16 max-w-2xl">{t("services.subtitle")}</p>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories?.map((cat, i) => {
                const Icon = iconMap[cat.icon || 'Server'] || Server;
                return (
                  <ScrollReveal key={cat.id} delay={i * 70}>
                    <div className="rounded-2xl border border-border bg-card p-8 h-full group hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.3)]">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 transition-all duration-500 group-hover:bg-primary/20">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground mb-3">{getLabel(cat)}</h2>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <SeoTextBlock>
        <h2>IT услуги в Ташкенте — полный спектр обслуживания</h2>
        <p>
          Novum Tech предоставляет широкий перечень IT услуг в Ташкенте для бизнеса любого масштаба. Наша IT компания в Ташкенте специализируется на комплексном обслуживании IT-инфраструктуры: от обслуживания компьютеров и ноутбуков до настройки серверного оборудования и корпоративных сетей.
        </p>
        <h3>Монтаж структурированных кабельных систем (СКС)</h3>
        <p>
          Профессиональный монтаж СКС — основа надёжной корпоративной сети. Мы выполняем проектирование, прокладку кабельных трасс, монтаж патч-панелей, сетевых розеток и коммутационного оборудования с гарантией качества.
        </p>
        <h3>Service desk и техническая поддержка</h3>
        <p>
          Наш <SeoLink to="/service-desk">service desk в Ташкенте</SeoLink> обеспечивает оперативную обработку заявок и решение инцидентов. IT аутсорсинг с SLA — это гарантия времени реакции и прозрачная отчётность для вашего бизнеса.
        </p>
        <h3>Внедрение CRM и автоматизация</h3>
        <p>
          Помогаем с внедрением CRM в Узбекистане и автоматизацией бизнес-процессов. Настроим систему под задачи вашей компании, обучим сотрудников и обеспечим техническое сопровождение. <SeoLink to="/constructor">Соберите свой тариф</SeoLink> или <SeoLink to="/contacts">свяжитесь с нами</SeoLink> для консультации.
        </p>
      </SeoTextBlock>

      <Footer />
    </div>
  );
}
