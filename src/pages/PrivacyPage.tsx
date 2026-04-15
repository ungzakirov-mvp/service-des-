import { useLanguage } from '@/i18n/LanguageContext';
import ScrollReveal from '@/components/ScrollReveal';
import SEOHead from '@/components/SEOHead';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  const { lang } = useLanguage();

  const content = {
    ru: {
      title: 'Политика конфиденциальности',
      text: `Novum Tech уважает вашу конфиденциальность и обязуется защищать персональные данные. Мы собираем только ту информацию, которая необходима для предоставления наших услуг IT-аутсорсинга.

Собранные данные (имя, контактная информация, информация о компании) используются исключительно для обработки заявок и предоставления технической поддержки. Мы не передаём ваши данные третьим лицам без вашего согласия.

Мы применяем современные методы защиты данных, включая шифрование и безопасное хранение. Вы имеете право запросить удаление своих персональных данных в любое время.

По всем вопросам, связанным с обработкой персональных данных, вы можете связаться с нами по адресу support@novumtech.uz.`,
    },
    uz: {
      title: 'Maxfiylik siyosati',
      text: `Novum Tech sizning maxfiyligingizni hurmat qiladi va shaxsiy ma'lumotlarni himoya qilishga majburdir. Biz faqat IT-autsorsing xizmatlarimizni ko'rsatish uchun zarur bo'lgan ma'lumotlarni yig'amiz.

Yig'ilgan ma'lumotlar (ism, aloqa ma'lumotlari, kompaniya ma'lumotlari) faqat so'rovlarni qayta ishlash va texnik yordam ko'rsatish uchun ishlatiladi. Sizning roziligingiz bo'lmasa, ma'lumotlaringizni uchinchi shaxslarga bermaimiz.

Biz ma'lumotlarni himoya qilishning zamonaviy usullarini qo'llaymiz. Istalgan vaqtda shaxsiy ma'lumotlaringizni o'chirishni so'rashingiz mumkin.

support@novumtech.uz orqali bog'lanishingiz mumkin.`,
    },
    en: {
      title: 'Privacy Policy',
      text: `Novum Tech respects your privacy and is committed to protecting personal data. We only collect information necessary to provide our IT outsourcing services.

Collected data (name, contact information, company details) is used solely for processing requests and providing technical support. We do not share your data with third parties without your consent.

We use modern data protection methods, including encryption and secure storage. You have the right to request deletion of your personal data at any time.

For all questions related to personal data processing, contact us at support@novumtech.uz.`,
    },
  };
  const l = content[lang] || content.ru;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Политика конфиденциальности — Novum Tech" description="Политика конфиденциальности Novum Tech: как мы собираем, используем и защищаем ваши персональные данные." canonical="https://novumtech.uz/privacy" />
      <Navbar />
      <main className="pt-16">
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
        <ScrollReveal>
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-8">{l.title}</h1>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <div className="glass rounded-2xl p-8">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{l.text}</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
      </main>
      <Footer />
    </div>
  );
}
