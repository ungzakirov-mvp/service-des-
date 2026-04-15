import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BOT_PATTERNS = [
  'googlebot', 'yandex', 'bingbot', 'yahoo', 'duckduckbot',
  'baiduspider', 'applebot', 'semrush', 'ahrefs', 'gptbot',
  'claudebot', 'anthropic-ai', 'Bytespider', 'CCBot', 'DataForSeoBot',
  'SeznamBot', 'MJ12bot', 'rogerbot', 'embedly', 'quora link preview',
  'showyoubot', 'outbrain', 'pinterest', 'slackbot', 'vkShare',
  'facebookexternalhit', 'twitterbot', 'redditbot', 'apple-', 'yandex.com/bots'
];

function isBot(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some(p => lower.includes(p));
}

const BASE = 'https://novumtech.uz';

const pages = {

  '/': {
    title: 'IT-аутсорсинг в Ташкенте — Novum Tech | Обслуживание компьютеров и серверов',
    description: 'IT-аутсорсинг в Ташкенте от Novum Tech. Обслуживание компьютеров, серверов, сетей, Service Desk. SLA 99.9%, реакция за 30 минут. Звоните: +998 99 998-17-77.',
    h1: 'IT-аутсорсинг для бизнеса в Ташкенте',
    content: `
      <section>
        <h2>IT-аутсорсинг для компаний 5–150 рабочих мест в Ташкенте</h2>
        <p>Поддержка по SLA, Service Desk, обслуживание рабочих мест, серверов и офисной инфраструктуры. Прозрачные тарифы, договор и понятные условия. Novum Tech — IT компания в Ташкенте с 15+ годами опыта.</p>
        <h3>Наши IT услуги в Ташкенте</h3>
        <ul>
          <li>Обслуживание серверов — проектирование, настройка, мониторинг 24/7, резервное копирование</li>
          <li>IT Security Audit — комплексный аудит безопасности, выявление уязвимостей</li>
          <li>Workstation Support — обслуживание ПК, установка ПО, техническая поддержка</li>
          <li>Монтаж СКС — проектирование и монтаж структурированных кабельных систем</li>
          <li>Офисная техника — обслуживание принтеров, МФУ, заправка картриджей</li>
          <li>Автоматизация — внедрение CRM, ERP, интеграция систем</li>
        </ul>
        <h3>Почему выбирают Novum Tech</h3>
        <ul>
          <li>SLA 99.9% — гарантированная доступность инфраструктуры</li>
          <li>Реакция на критические инциденты до 30 минут</li>
          <li>Команда сертифицированных IT-специалистов</li>
          <li>Прозрачная ежемесячная отчётность по всем работам</li>
          <li>Service Desk в каждом тарифе — заявки через Telegram</li>
          <li>Масштабируемые решения под рост бизнеса</li>
        </ul>
        <h3>Тарифы IT-обслуживания</h3>
        <p>Novum Tech предлагает тарифы для компаний от 5 до 150 рабочих мест. Service Desk платформа включена во все тарифы. Рассчитайте стоимость за 30 секунд или запросите бесплатный IT-аудит.</p>
        <h3>IT аутсорсинг в Ташкенте — доверьте IT профессионалам</h3>
        <p>Novum Tech — IT компания в Ташкенте, предоставляющая полный спектр IT услуг для бизнеса. Мы специализируемся на IT аутсорсинге для компаний от 5 до 150 рабочих мест. Внедрение CRM, автоматизация бизнес-процессов, service desk в Ташкенте. Штатный IT-инженер обходится от 18 000 000 сум/мес. Novum Tech предоставляет полноценную команду поддержки без кадровых рисков.</p>
      </section>
    `
  },

  '/about': {
    title: 'О компании Novum Tech — IT-аутсорсинг в Ташкенте',
    description: 'Novum Tech — IT компания в Ташкенте. Опытная команда, прозрачные процессы, SLA 99.9%. IT аутсорсинг, обслуживание компьютеров, внедрение CRM в Узбекистане.',
    h1: 'О компании Novum Tech',
    content: `
      <section>
        <h2>О компании Novum Tech</h2>
        <p>Novum Tech — IT компания в Ташкенте, предоставляющая полный спектр IT услуг для бизнеса. Мы специализируемся на IT аутсорсинге для компаний от 5 до 150 рабочих мест и помогаем предприятиям сосредоточиться на основной деятельности, передав обслуживание IT-инфраструктуры профессионалам. 15+ лет опыта IT-поддержки, быстрая реакция по SLA, Service Desk система в каждом тарифе.</p>
        <h3>Наши преимущества</h3>
        <ul>
          <li>SLA 99.9% — гарантированная доступность инфраструктуры</li>
          <li>Прозрачная ежемесячная отчётность по всем работам</li>
          <li>Реакция на критические инциденты до 30 минут</li>
          <li>Команда сертифицированных IT-специалистов</li>
          <li>Индивидуальный подход к каждому клиенту</li>
          <li>Масштабируемые решения под рост бизнеса</li>
        </ul>
        <h3>Как мы работаем</h3>
        <p><strong>Экспресс-аудит IT:</strong> Анализируем текущую инфраструктуру, выявляем узкие места и риски. Это бесплатно.</p>
        <p><strong>Формируем предложение:</strong> Составляем план обслуживания и прозрачную смету под ваши задачи.</p>
        <p><strong>Подключаем и настраиваем:</strong> Внедряем решения, настраиваем мониторинг и резервное копирование.</p>
        <p><strong>Поддержка и контроль:</strong> Обеспечиваем бесперебойную работу с ежемесячной отчётностью.</p>
        <h3>Наши клиенты</h3>
        <p>Мы обслуживаем компании от 5 до 150 рабочих мест в Ташкенте. Это оптимальный масштаб, при котором IT-аутсорсинг значительно выгоднее содержания собственного IT-отдела. Штатный IT-инженер обходится от 18 000 000 сум/мес. Novum Tech предоставляет полноценную команду поддержки без кадровых рисков.</p>
      </section>
    `
  },

  '/services': {
    title: 'IT услуги в Ташкенте — обслуживание компьютеров и серверов | Novum Tech',
    description: 'IT услуги в Ташкенте: обслуживание компьютеров, серверов, монтаж СКС, внедрение CRM, service desk. IT аутсорсинг для бизнеса от Novum Tech. SLA 99.9%.',
    h1: 'IT услуги в Ташкенте',
    content: `
      <section>
        <h2>Комплексное IT-обслуживание для стабильной работы вашего бизнеса</h2>
        <h3>Server Management — Серверные решения</h3>
        <p>Проектирование, настройка и сопровождение серверной инфраструктуры. Мониторинг 24/7, резервное копирование и отказоустойчивость.</p>
        <h3>IT Security Audit — Безопасность IT</h3>
        <p>Комплексный аудит безопасности, выявление уязвимостей, настройка защиты данных и соответствие стандартам информационной безопасности.</p>
        <h3>Workstation Support — Поддержка оборудования</h3>
        <p>Обслуживание и настройка рабочих станций, установка ПО, оперативное решение проблем пользователей и техническая поддержка.</p>
        <h3>Монтажные работы СКС — Структурированные кабельные системы</h3>
        <p>Проектирование и монтаж СКС, прокладка кабельных трасс, установка коммутационных шкафов и розеток.</p>
        <h3>Офисная техника — Обслуживание и ремонт</h3>
        <p>Обслуживание, ремонт и настройка принтеров, МФУ и другой офисной техники. Заправка картриджей.</p>
        <h3>Автоматизация — Бизнес-процессы</h3>
        <p>Сопровождение и автоматизация бизнес-процессов. Внедрение CRM, ERP и интеграция систем.</p>
        <h3>Продажа и интеграция лицензий</h3>
        <p>Поставка, лицензирование и внедрение корпоративного ПО и решений безопасности. Microsoft 365, Windows Server, Azure. ESET NOD32 и антивирусы корпоративного уровня. DLP-системы и Endpoint Protection. SIEM-системы мониторинга. Firewall решения и VPN. Backup-системы и восстановление.</p>
        <p><a href="${BASE}/constructor">Сконструируйте свой тариф</a> — выберите нужные услуги из прайс-листа, стоимость рассчитается автоматически. <a href="${BASE}/contacts">Свяжитесь с нами</a> для бесплатной консультации.</p>
      </section>
    `
  },

  '/contacts': {
    title: 'Контакты Novum Tech — IT-компания Ташкент | IT-аутсорсинг',
    description: 'Свяжитесь с Novum Tech: телефон +998 99 998-17-77, email support@novumtech.uz. IT аутсорсинг, обслуживание компьютеров, service desk. Бесплатная консультация в Ташкенте.',
    h1: 'Контакты Novum Tech',
    content: `
      <section>
        <h2>Свяжитесь с Novum Tech</h2>
        <p>Оставьте заявку — мы проведём бесплатный экспресс-аудит вашей IT-инфраструктуры. Ответим в течение 30 минут.</p>
        <h3>Контактная информация</h3>
        <ul>
          <li><strong>Телефон:</strong> <a href="tel:+998999981777">+998 99 998-17-77</a></li>
          <li><strong>Email:</strong> <a href="mailto:support@novumtech.uz">support@novumtech.uz</a></li>
          <li><strong>Telegram:</strong> <a href="https://t.me/novumtechaza">@novumtechaza</a></li>
          <li><strong>Instagram:</strong> <a href="https://instagram.com/novum_tech">novum_tech</a></li>
          <li><strong>Адрес:</strong> г. Ташкент, Узбекистан</li>
        </ul>
        <h3>Запросить IT-аудит</h3>
        <p>Оставьте заявку на бесплатный IT-аудит. Мы проанализируем вашу IT-инфраструктуру, выявим узкие места и составим план оптимизации. Выберите интересующий тарифный план или оставьте пустым для получения рекомендации после аудита.</p>
        <h3>Как добраться</h3>
        <p>Офис Novum Tech расположен в Ташкенте. Работаем Пн-Пт с 09:00 до 18:00. Для выездных работ наши инженеры готовы прибыть в любую точку Ташкента.</p>
      </section>
    `
  },

  '/faq': {
    title: 'FAQ — вопросы об IT аутсорсинге в Ташкенте | Novum Tech',
    description: 'Ответы на частые вопросы об IT аутсорсинге в Ташкенте: SLA, тарифы, service desk, обслуживание компьютеров. IT компания Novum Tech — всё прозрачно.',
    h1: 'Частые вопросы об IT-аутсорсинге',
    content: `
      <section>
        <h2>Ответы на популярные вопросы об IT-аутсорсинге</h2>
        <h3>Что такое IT-аутсорсинг и зачем он нужен?</h3>
        <p>IT-аутсорсинг — это передача IT-задач внешней команде специалистов. Это позволяет сократить расходы на штатных IT-сотрудников, повысить качество обслуживания и сосредоточиться на основном бизнесе.</p>
        <h3>Для каких компаний подходят ваши услуги?</h3>
        <p>Мы работаем с компаниями от 5 до 150 сотрудников в Ташкенте. Это оптимальный масштаб, при котором IT-аутсорсинг значительно выгоднее содержания собственного IT-отдела. Штатный IT-инженер обходится от 18 000 000 сум/мес. Novum Tech предоставляет полноценную команду поддержки без кадровых рисков.</p>
        <h3>Как быстро вы реагируете на инциденты?</h3>
        <p>Время реакции на критические инциденты — до 30 минут. Мы используем системы мониторинга 24/7 и часто устраняем проблемы ещё до того, как вы их заметите. SLA 99.9% гарантирует доступность вашей IT-инфраструктуры.</p>
        <h3>Что входит в SLA 99.9%?</h3>
        <p>SLA 99.9% гарантирует, что ваша IT-инфраструктура будет доступна 99.9% времени. Это включает мониторинг, резервное копирование, оперативное устранение сбоев и плановое обслуживание.</p>
        <h3>Как происходит переход на аутсорсинг?</h3>
        <p>Процесс начинается с бесплатного IT-аудита. Мы анализируем текущую инфраструктуру, составляем план, согласовываем его с вами и плавно переводим обслуживание без простоев.</p>
        <h3>Какова стоимость IT-аутсорсинга?</h3>
        <p>Стоимость зависит от количества сотрудников, состава оборудования и требуемых услуг. После бесплатного аудита мы предоставим прозрачную смету без скрытых платежей. Рассчитайте стоимость <a href="${BASE}/constructor">в конструкторе тарифов</a> за 30 секунд.</p>
        <p>Есть другие вопросы? <a href="${BASE}/contacts">Свяжитесь с нами</a> для бесплатной консультации.</p>
      </section>
    `
  },

  '/service-desk': {
    title: 'Service Desk в Ташкенте — техническая поддержка от Novum Tech',
    description: 'Service desk в Ташкенте: оперативная обработка заявок, решение инцидентов, SLA 99.9%. IT поддержка для бизнеса. Контролируйте все заявки через Telegram-бот.',
    h1: 'Service Desk Novum Tech',
    content: `
      <section>
        <h2>Service Desk — техническая поддержка в Ташкенте</h2>
        <p>Оперативная обработка заявок, решение инцидентов, SLA 99.9%. Контролируйте все IT-заявки через Telegram-бот и мобильное приложение. Полная прозрачность, контроль и скорость решения.</p>
        <h3>Что включает Service Desk</h3>
        <ul>
          <li>Присвоение номера заявки</li>
          <li>Контроль статуса в реальном времени</li>
          <li>История всех заявок</li>
          <li>Уведомления пользователей</li>
          <li>Мобильное приложение</li>
          <li>Push-уведомления</li>
          <li>Управление заявками</li>
        </ul>
        <h3>Почему компании используют Service Desk</h3>
        <ul>
          <li><strong>Контроль всех заявок</strong> — ни одна заявка не теряется</li>
          <li><strong>Быстрая обработка</strong> — сотрудники получают помощь быстрее</li>
          <li><strong>Прозрачность</strong> — руководство видит всю IT-активность</li>
          <li><strong>Удобство</strong> — Telegram и мобильное приложение</li>
        </ul>
        <p>Service Desk включён во все тарифы Novum Tech. <a href="${BASE}/contacts">Подключите Service Desk</a> для вашей компании.</p>
      </section>
    `
  },

  '/constructor': {
    title: 'Конструктор IT-услуг — соберите свой тариф | Novum Tech',
    description: 'Соберите свой тариф IT-аутсорсинга в Ташкенте: выберите нужные услуги и получите расчёт стоимости. Без скрытых платежей.',
    h1: 'Конструктор тарифов IT-аутсорсинга',
    content: `
      <section>
        <h2>Сконструируйте свой тариф IT-аутсорсинга</h2>
        <p>Выберите нужные услуги из прайс-листа — стоимость рассчитается автоматически. Рассчитайте стоимость IT-поддержки за 30 секунд и получите мгновенный расчёт и рекомендуемый тариф.</p>
        <h3>Доступные категории услуг</h3>
        <ul>
          <li>Выезд специалиста</li>
          <li>ПК и ноутбуки — установка Windows, проверка на вирусы, восстановление ПК</li>
          <li>Серверные решения</li>
          <li>Сетевое оборудование</li>
          <li>Монтаж СКС</li>
          <li>Видеонаблюдение</li>
        </ul>
        <h3>Как это работает</h3>
        <p>Укажите количество компьютеров и принтеров, выберите уровень поддержки (стандартный, высокий, максимальный). При максимальном приоритете инженер постоянно находится в вашем офисе. Запросите коммерческое предложение — наш специалист подготовит персональное предложение.</p>
        <p>Штатный IT-инженер обходится от 18 000 000 сум/мес. Novum Tech предоставляет полноценную команду поддержки без кадровых рисков. <a href="${BASE}/contacts">Свяжитесь с нами</a> для расчёта.</p>
      </section>
    `
  },

  '/privacy': {
    title: 'Политика конфиденциальности — Novum Tech',
    description: 'Политика конфиденциальности IT-компании Novum Tech. Защита персональных данных, безопасное хранение, право на удаление данных.',
    h1: 'Политика конфиденциальности',
    content: `
      <section>
        <h2>Политика конфиденциальности Novum Tech</h2>
        <p>Novum Tech уважает вашу конфиденциальность и обязуется защищать персональные данные. Мы собираем только ту информацию, которая необходима для предоставления наших услуг IT-аутсорсинга.</p>
        <h3>Собранные данные</h3>
        <p>Имя, контактная информация, информация о компании — используются исключительно для обработки заявок и предоставления технической поддержки.</p>
        <h3>Защита данных</h3>
        <p>Мы не передаём ваши данные третьим лицам без вашего согласия. Применяем современные методы защиты данных, включая шифрование и безопасное хранение.</p>
        <h3>Ваши права</h3>
        <p>Вы имеете право запросить удаление своих персональных данных в любое время.</p>
        <h3>Контакты</h3>
        <p>По всем вопросам, связанным с обработкой персональных данных, вы можете связаться с нами по адресу <a href="mailto:support@novumtech.uz">support@novumtech.uz</a>.</p>
      </section>
    `
  },

};

function buildHtml(page, path) {
  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Novum Tech",
    "url": BASE,
    "telephone": "+998999981777",
    "email": "support@novumtech.uz",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Исткбол, 16",
      "addressLocality": "Ташкент",
      "addressRegion": "Ташкент",
      "postalCode": "100000",
      "addressCountry": "UZ"
    },
    "geo": { "@type": "GeoCoordinates", "latitude": "41.2995", "longitude": "69.2401" },
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "09:00", "closes": "18:00" }
    ],
    "priceRange": "$$",
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "47" },
    "sameAs": ["https://t.me/novumtechaza", "https://instagram.com/novum_tech"]
  }, null, 2);

  const orgJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Novum Tech",
    "url": BASE,
    "description": "IT-аутсорсинг для компаний 5–150 рабочих мест в Ташкенте",
    "contactPoint": { "@type": "ContactPoint", "telephone": "+998999981777", "contactType": "customer service", "availableLanguage": ["Russian","Uzbek","English"] },
    "areaServed": { "@type": "City", "name": "Ташкент" }
  }, null, 2);

  const serviceJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "IT-аутсорсинг",
    "provider": { "@type": "LocalBusiness", "name": "Novum Tech", "telephone": "+998999981777" },
    "areaServed": { "@type": "City", "name": "Ташкент" },
    "description": page.description,
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "IT услуги",
      "itemListElement": [
        {"@type":"Offer","itemOffered":{"@type":"Service","name":"Обслуживание компьютеров"}},
        {"@type":"Offer","itemOffered":{"@type":"Service","name":"Обслуживание серверов"}},
        {"@type":"Offer","itemOffered":{"@type":"Service","name":"Service Desk"}},
        {"@type":"Offer","itemOffered":{"@type":"Service","name":"Монтаж СКС"}},
        {"@type":"Offer","itemOffered":{"@type":"Service","name":"Внедрение CRM"}}
      ]
    }
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <meta name="description" content="${page.description}">
  <meta name="robots" content="index, follow">
  <meta name="googlebot" content="index, follow">
  <meta name="yandex-verification" content="fd1a4df8eccf9101">
  <meta name="author" content="Novum Tech">
  <link rel="canonical" href="${BASE}${path}">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE}${path}">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="Novum Tech">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${page.title}">
  <meta name="twitter:description" content="${page.description}">
  <script type="application/ld+json">${ldJson}</script>
  <script type="application/ld+json">${orgJson}</script>
  <script type="application/ld+json">${serviceJson}</script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #fafafa; line-height: 1.6; }
    .header { background: #1a1a2e; color: white; padding: 16px 24px; }
    .header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 20px; font-weight: 700; color: #3b82f6; text-decoration: none; }
    .nav { display: flex; gap: 24px; flex-wrap: wrap; }
    .nav a { color: #ccc; text-decoration: none; font-size: 14px; }
    .nav a:hover { color: white; }
    .hero { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 60px 24px; text-align: center; }
    .hero h1 { font-size: 36px; margin-bottom: 16px; font-weight: 800; }
    .hero p { font-size: 18px; opacity: 0.85; max-width: 700px; margin: 0 auto 24px; }
    .cta-btn { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .container { max-width: 1000px; margin: 0 auto; padding: 48px 24px; }
    .trust-bar { background: white; border-bottom: 1px solid #eee; padding: 20px 24px; }
    .trust-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
    .trust-item { text-align: center; }
    .trust-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .trust-label { font-size: 13px; color: #666; }
    section h2 { font-size: 28px; margin-bottom: 16px; color: #1a1a2e; }
    section h3 { font-size: 20px; margin: 24px 0 12px; color: #1a1a2e; }
    section p { font-size: 16px; color: #4a4a6a; margin-bottom: 16px; }
    section ul { padding-left: 24px; margin-bottom: 16px; }
    section li { margin-bottom: 8px; color: #4a4a6a; }
    .contact-box { background: #f0f4ff; border-radius: 12px; padding: 32px; margin-top: 32px; }
    .contact-box h3 { margin-top: 0; }
    .contact-box a { color: #3b82f6; }
    .footer { background: #1a1a2e; color: #888; padding: 32px 24px; text-align: center; font-size: 14px; }
    .footer a { color: #aaa; text-decoration: none; }
    .footer a:hover { color: white; }
    @media (max-width: 600px) { .hero h1 { font-size: 26px; } .trust-inner { gap: 24px; } .nav { display: none; } }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="${BASE}/" class="logo">Novum Tech</a>
      <nav class="nav">
        <a href="${BASE}/services">Услуги</a>
        <a href="${BASE}/constructor">Тарифы</a>
        <a href="${BASE}/about">О нас</a>
        <a href="${BASE}/faq">FAQ</a>
        <a href="${BASE}/contacts">Контакты</a>
      </nav>
    </div>
  </header>

  <div class="trust-bar">
    <div class="trust-inner">
      <div class="trust-item"><div class="trust-value">SLA 99.9%</div><div class="trust-label">Гарантия доступности</div></div>
      <div class="trust-item"><div class="trust-value">15+ лет</div><div class="trust-label">Опыт IT-поддержки</div></div>
      <div class="trust-item"><div class="trust-value">30 мин</div><div class="trust-label">Реакция на инциденты</div></div>
      <div class="trust-item"><div class="trust-value">5–150</div><div class="trust-label">Рабочих мест</div></div>
    </div>
  </div>

  <div class="hero">
    <h1>${page.h1}</h1>
    <p>IT-аутсорсинг для бизнеса в Ташкенте. +998 99 998-17-77 · Пн-Пт 09:00-18:00</p>
    <a href="${BASE}/contacts" class="cta-btn">Запросить IT-аудит →</a>
  </div>

  <main class="container">
    ${page.content}
    <div class="contact-box">
      <h3>Свяжитесь с Novum Tech</h3>
      <p>Бесплатный IT-аудит · Ответ в течение 30 минут</p>
      <p><strong>📞</strong> <a href="tel:+998999981777">+998 99 998-17-77</a></p>
      <p><strong>✉️</strong> <a href="mailto:support@novumtech.uz">support@novumtech.uz</a></p>
      <p><strong>📍</strong> г. Ташкент, Мирабадский р-н, ул. Исткбол, 16</p>
      <p><strong>⏰</strong> Пн-Пт: 09:00-18:00</p>
    </div>
  </main>

  <footer class="footer">
    <p>© 2026 Novum Tech · IT-аутсорсинг в Ташкенте</p>
    <p style="margin-top:8px">
      <a href="${BASE}/services">Услуги</a> ·
      <a href="${BASE}/about">О нас</a> ·
      <a href="${BASE}/faq">FAQ</a> ·
      <a href="${BASE}/contacts">Контакты</a> ·
      <a href="${BASE}/privacy">Конфиденциальность</a>
    </p>
  </footer>
</body>
</html>`;
}

export const config = {
  matcher: [
    '/',
    '/about',
    '/services',
    '/contacts',
    '/faq',
    '/service-desk',
    '/constructor',
    '/privacy',
  ],
};

export function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  
  if (!isBot(ua)) {
    return NextResponse.next();
  }

  const path = new URL(request.url).pathname;
  const page = pages[path];

  if (!page) {
    return NextResponse.next();
  }

  const html = buildHtml(page, path);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'index, follow',
    },
  });
}
