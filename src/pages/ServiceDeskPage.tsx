import { useLanguage } from '@/i18n/LanguageContext';
import ScrollReveal from '@/components/ScrollReveal';
import { Check, X, AlertTriangle } from 'lucide-react';

export default function ServiceDeskPage() {
  const { lang } = useLanguage();

  const labels = {
    ru: {
      title: 'Условия обслуживания Service Desk',
      howTitle: 'Как обрабатываются заявки',
      howDesc: 'Все обращения регистрируются через Service Desk. Каждая заявка получает уникальный номер, приоритет и SLA-срок решения. Вы видите статус в реальном времени через Telegram-бот или мобильное приложение.',
      prioritiesTitle: 'Приоритеты заявок',
      p1: 'P1 — Критический: Полная остановка работы. Реакция до 15 минут, решение до 2 часов.',
      p2: 'P2 — Высокий: Серьёзное ограничение работы. Реакция до 30 минут, решение до 4 часов.',
      p3: 'P3 — Средний: Частичное ограничение. Реакция до 1 часа, решение до 8 часов.',
      p4: 'P4 — Низкий: Запросы на улучшение, консультации. Реакция до 4 часов, решение до 24 часов.',
      includedTitle: 'Что входит в обслуживание',
      notIncludedTitle: 'Что не входит',
      included: [
        'Диагностика и устранение неисправностей ПК',
        'Настройка сетевого оборудования',
        'Установка и обновление ПО',
        'Поддержка серверной инфраструктуры',
        'Мониторинг и профилактика',
        'Консультации пользователей',
      ],
      notIncluded: [
        'Закупка оборудования и комплектующих',
        'Разработка ПО на заказ',
        'Ремонт оборудования вне гарантии',
        'Работы, не предусмотренные договором',
      ],
    },
    uz: {
      title: 'Service Desk xizmat shartlari',
      howTitle: "So'rovlar qanday qayta ishlanadi",
      howDesc: "Barcha murojaatlar Service Desk orqali ro'yxatga olinadi. Har bir so'rov noyob raqam, ustuvorlik va SLA hal qilish muddatini oladi.",
      prioritiesTitle: "So'rovlar ustuvorligi",
      p1: "P1 — Kritik: Ishning to'liq to'xtashi. Javob 15 daqiqagacha, yechim 2 soatgacha.",
      p2: "P2 — Yuqori: Jiddiy cheklov. Javob 30 daqiqagacha, yechim 4 soatgacha.",
      p3: "P3 — O'rtacha: Qisman cheklov. Javob 1 soatgacha, yechim 8 soatgacha.",
      p4: "P4 — Past: Yaxshilash so'rovlari. Javob 4 soatgacha, yechim 24 soatgacha.",
      includedTitle: 'Xizmatga nima kiradi',
      notIncludedTitle: 'Nima kirmaydi',
      included: [
        "Kompyuter nosozliklarini tashxislash va bartaraf etish",
        "Tarmoq uskunalarini sozlash",
        "Dasturiy ta'minotni o'rnatish va yangilash",
        'Server infratuzilmasini qo\'llab-quvvatlash',
        'Monitoring va profilaktika',
        'Foydalanuvchilarni konsultatsiya qilish',
      ],
      notIncluded: [
        'Uskunalar va ehtiyot qismlarni sotib olish',
        "Buyurtma bo'yicha dasturiy ta'minot ishlab chiqish",
        "Kafolatsiz uskunalarni ta'mirlash",
        "Shartnomada ko'zda tutilmagan ishlar",
      ],
    },
    en: {
      title: 'Service Desk Terms',
      howTitle: 'How requests are processed',
      howDesc: 'All requests are registered through Service Desk. Each ticket gets a unique number, priority, and SLA resolution time.',
      prioritiesTitle: 'Request priorities',
      p1: 'P1 — Critical: Complete work stoppage. Response within 15 min, resolution within 2 hours.',
      p2: 'P2 — High: Serious limitation. Response within 30 min, resolution within 4 hours.',
      p3: 'P3 — Medium: Partial limitation. Response within 1 hour, resolution within 8 hours.',
      p4: 'P4 — Low: Improvement requests, consultations. Response within 4 hours, resolution within 24 hours.',
      includedTitle: "What's included",
      notIncludedTitle: "What's not included",
      included: [
        'PC diagnostics and troubleshooting',
        'Network equipment configuration',
        'Software installation and updates',
        'Server infrastructure support',
        'Monitoring and maintenance',
        'User consultations',
      ],
      notIncluded: [
        'Hardware and parts procurement',
        'Custom software development',
        'Out-of-warranty equipment repair',
        'Work not covered by contract',
      ],
    },
  };
  const l = labels[lang] || labels.ru;

  const priorities = [
    { text: l.p1, color: 'text-destructive', bg: 'bg-destructive/10' },
    { text: l.p2, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { text: l.p3, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { text: l.p4, color: 'text-muted-foreground', bg: 'bg-muted/30' },
  ];

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(217,91%,60%,0.06),transparent_70%)]" />
      <div className="container mx-auto px-4 lg:px-8 max-w-4xl relative">
        <ScrollReveal>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-4">Service Desk</p>
          <h1 className="text-4xl lg:text-[3.25rem] font-bold text-foreground mb-10 leading-[1.1]">{l.title}</h1>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div className="card-premium glass rounded-2xl p-8 lg:p-10 mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">{l.howTitle}</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">{l.howDesc}</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <div className="card-premium glass rounded-2xl p-8 lg:p-10 mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-7">{l.prioritiesTitle}</h2>
            <div className="space-y-4">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <div className={`w-8 h-8 rounded-lg ${p.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <AlertTriangle className={`h-4 w-4 ${p.color}`} />
                  </div>
                  <p className="text-muted-foreground text-[15px] leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-5">
          <ScrollReveal delay={240}>
            <div className="card-premium glass rounded-2xl p-8 h-full">
              <h2 className="text-2xl font-bold text-foreground mb-7">{l.includedTitle}</h2>
              <div className="space-y-3.5">
                {l.included.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-muted-foreground text-[15px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={320}>
            <div className="card-premium glass rounded-2xl p-8 h-full">
              <h2 className="text-2xl font-bold text-foreground mb-7">{l.notIncludedTitle}</h2>
              <div className="space-y-3.5">
                {l.notIncluded.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-md bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground text-[15px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
