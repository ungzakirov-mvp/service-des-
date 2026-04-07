export const config = {
  runtime: 'edge',
};

const pages = {
  '/': { title: 'IT-аутсорсинг в Ташкенте — Novum Tech', desc: 'IT-аутсорсинг в Ташкенте. Обслуживание компьютеров, серверов, сетей. SLA 99.9%, реакция 30 минут. Звоните: +998 99 998-17-77', h1: 'IT-аутсорсинг для бизнеса в Ташкенте' },
  '/services': { title: 'IT услуги Ташкент — обслуживание компьютеров и серверов', desc: 'IT услуги в Ташкенте: обслуживание компьютеров, серверов, монтаж СКС, внедрение CRM, service desk.', h1: 'IT услуги в Ташкенте' },
  '/about': { title: 'О компании Novum Tech — IT-аутсорсинг в Ташкенте', desc: 'IT-компания Novum Tech. Опыт более 10 лет. Обслуживаем 50+ компаний в Ташкенте.', h1: 'О компании Novum Tech' },
  '/faq': { title: 'FAQ — Частые вопросы об IT-аутсорсинге', desc: 'Ответы на частые вопросы об IT-аутсорсинге, обслуживании компьютеров и серверов в Ташкенте.', h1: 'Часто задаваемые вопросы' },
  '/contacts': { title: 'Контакты Novum Tech — IT-компания Ташкент', desc: 'Свяжитесь с нами: +998 99 998-17-77, support@novumtech.uz. г. Ташкент, ул. Исткбол, 16.', h1: 'Контакты Novum Tech' },
  '/constructor': { title: 'Конструктор IT-услуг — соберите свой тариф', desc: 'Соберите свой тариф IT-аутсорсинга: выберите нужные услуги и получите расчёт стоимости.', h1: 'Конструктор тарифов' },
  '/service-desk': { title: 'Service Desk — техническая поддержка в Ташкенте', desc: 'Service desk в Ташкенте: оперативная обработка заявок, решение инцидентов, SLA 99.9%.', h1: 'Service Desk Novum Tech' },
  '/privacy': { title: 'Политика конфиденциальности — Novum Tech', desc: 'Политика конфиденциальности IT-компании Novum Tech.', h1: 'Политика конфиденциальности' },
};

const base = 'https://novumtech.uz';

export default function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const page = pages[path];

  if (!page) {
    return new Response('Not Found', { status: 404 });
  }

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <meta name="description" content="${page.desc}">
  <meta name="robots" content="index, follow">
  <meta name="googlebot" content="index, follow">
  <meta name="yandex-verification" content="fd1a4df8eccf9101">
  <link rel="canonical" href="${base}${path}">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.desc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${base}${path}">
  <meta property="og:locale" content="ru_RU">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Novum Tech",
    "url": "${base}",
    "telephone": "+998999981777",
    "email": "support@novumtech.uz",
    "address": {"@type": "PostalAddress", "streetAddress": "ул. Исткбол, 16", "addressLocality": "Мирабадский район", "addressRegion": "Ташкент", "postalCode": "100000", "addressCountry": "UZ"},
    "openingHoursSpecification": {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "18:00"},
    "priceRange": "$$",
    "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "47"}
  }
  </script>
</head>
<body style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="font-size: 28px; color: #1a1a1a; margin-bottom: 20px;">${page.h1}</h1>
  <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a;">${page.desc}</p>
  <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
    <p><strong>📞</strong> <a href="tel:+998999981777">+998 99 998-17-77</a></p>
    <p><strong>✉️</strong> <a href="mailto:support@novumtech.uz">support@novumtech.uz</a></p>
    <p><strong>📍</strong> г. Ташкент, Мирабадский р-н, ул. Исткбол, 16</p>
    <p><strong>⏰</strong> Пн-Пт: 09:00-18:00</p>
  </div>
  <div style="margin-top: 30px;">
    <a href="${base}${path}" style="display: inline-block; padding: 14px 28px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Перейти на сайт →</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}