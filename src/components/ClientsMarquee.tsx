import ScrollReveal from '@/components/ScrollReveal';
import { useLanguage } from '@/i18n/LanguageContext';
import { Star, Quote } from 'lucide-react';

const clients = [
  'JacMotors Uzbekistan',
  'Neftgazinjiniring',
  'UNG-Oversea',
  'UNG Academy',
  'Silk Road Energy Injiniring',
];

const testimonials = {
  ru: [
    {
      name: 'Алишер Каримов',
      role: 'Директор IT-отдела',
      company: 'JacMotors Uzbekistan',
      text: 'Работаем с Novum Tech уже более 3 лет. За это время ни одного критического инцидента без решения в рамках SLA. Профессиональная команда, которая понимает бизнес-процессы и всегда на связи.',
      years: '3+ года сотрудничества',
    },
    {
      name: 'Бахтиёр Рахимов',
      role: 'Генеральный директор',
      company: 'Neftgazinjiniring',
      text: 'До Novum Tech мы меняли подрядчиков каждые полгода. Сейчас у нас стабильная инфраструктура, прозрачная отчётность и предсказуемый бюджет на IT. Рекомендую всем, кто устал от хаоса.',
      years: '2+ года сотрудничества',
    },
    {
      name: 'Дильшод Назаров',
      role: 'Операционный директор',
      company: 'UNG-Oversea',
      text: 'Novum Tech помогли нам масштабировать IT-инфраструктуру с 15 до 80 рабочих мест без единого простоя. Service Desk работает как часы — заявки закрываются быстро и качественно.',
      years: '4+ года сотрудничества',
    },
    {
      name: 'Малика Усманова',
      role: 'Руководитель администрации',
      company: 'UNG Academy',
      text: 'Очень довольны уровнем сервиса. Раньше IT-проблемы отнимали половину рабочего дня, теперь всё решается через Service Desk за считанные часы. Команда всегда вежлива и компетентна.',
      years: '2+ года сотрудничества',
    },
  ],
  uz: [
    {
      name: 'Alisher Karimov',
      role: "IT bo'lim direktori",
      company: 'JacMotors Uzbekistan',
      text: "Novum Tech bilan 3 yildan ortiq ishlaymiz. Bu vaqt ichida SLA doirasida hal qilinmagan birorta ham muhim hodisa bo'lmadi. Professional jamoa.",
      years: '3+ yil hamkorlik',
    },
    {
      name: 'Baxtiyor Raximov',
      role: 'Bosh direktor',
      company: 'Neftgazinjiniring',
      text: "Novum Tech dan oldin har yarim yilda pudratchilarni almashtirar edik. Hozir bizda barqaror infratuzilma va bashorat qilinadigan IT byudjeti bor.",
      years: '2+ yil hamkorlik',
    },
    {
      name: 'Dilshod Nazarov',
      role: 'Operatsion direktor',
      company: 'UNG-Oversea',
      text: "Novum Tech bizga IT-infratuzilmani 15 dan 80 ish joyiga ko'paytirishga yordam berdi. Service Desk soat kabi ishlaydi.",
      years: '4+ yil hamkorlik',
    },
    {
      name: 'Malika Usmonova',
      role: "Ma'muriyat rahbari",
      company: 'UNG Academy',
      text: "Xizmat darajasidan juda mamnunmiz. Oldin IT muammolari ish kunining yarmini olardi, endi hammasi Service Desk orqali bir necha soat ichida hal qilinadi.",
      years: '2+ yil hamkorlik',
    },
  ],
};

export default function ClientsMarquee() {
  const { lang } = useLanguage();
  const clientsTitle = lang === 'uz' ? 'Bizning mijozlarimiz' : lang === 'en' ? 'Our Clients' : 'Наши клиенты';
  const reviewsTitle = lang === 'uz' ? 'Mijozlarimiz fikrlari' : lang === 'en' ? 'Client Reviews' : 'Отзывы клиентов';
  const reviews = lang === 'uz' ? testimonials.uz : testimonials.ru;

  const doubled = [...clients, ...clients];

  return (
    <>
      {/* === CLIENTS LOGOS === */}
      <section className="py-12 lg:py-16 relative overflow-hidden">
        <div className="section-divider" />
        <div className="container mx-auto px-4 lg:px-8 pt-12 lg:pt-16">
          <ScrollReveal>
            <div className="text-center mb-10">
              <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-3">Trusted by</p>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">{clientsTitle}</h2>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={100}>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 lg:w-40 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-24 lg:w-40 bg-gradient-to-l from-background to-transparent z-10" />

            <div className="flex animate-marquee whitespace-nowrap py-4">
              {doubled.map((name, i) => (
                <div
                  key={i}
                  className="inline-flex items-center mx-4 lg:mx-8 px-8 lg:px-10 py-5 lg:py-6 rounded-2xl glass border border-border/20 cursor-default transition-all duration-500 hover:border-primary/30 hover:scale-110 hover:shadow-[0_0_40px_-8px_hsl(217,91%,60%,0.2)] hover:bg-card/80"
                >
                  <span
                    className="text-xl lg:text-2xl font-bold tracking-tight text-muted-foreground/70 transition-all duration-500 whitespace-nowrap hover:text-foreground"
                    style={{ fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.02em' }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* === TESTIMONIALS === */}
      <section className="py-12 lg:py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,hsl(217,91%,60%,0.03),transparent)]" />
        <div className="container mx-auto px-4 lg:px-8 relative">
          <ScrollReveal>
            <div className="text-center mb-10">
              <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-3">Testimonials</p>
              <h2 className="text-3xl lg:text-[2.5rem] font-bold text-foreground leading-tight">{reviewsTitle}</h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            {reviews.map((review, i) => (
              <ScrollReveal key={i} delay={i * 80}>
                <div className="card-premium glass glass-hover rounded-2xl p-6 lg:p-7 h-full flex flex-col group">
                  <Quote className="h-8 w-8 text-primary/20 mb-4 transition-colors duration-500 group-hover:text-primary/40" />
                  <p className="text-sm lg:text-base text-muted-foreground leading-relaxed mb-5 flex-1">
                    «{review.text}»
                  </p>
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{review.name}</div>
                      <div className="text-xs text-muted-foreground">{review.company}</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
