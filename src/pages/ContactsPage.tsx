import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import ScrollReveal from "@/components/ScrollReveal";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/i18n/LanguageContext";
import { Phone, Mail, MapPin, Send, Instagram } from "lucide-react";

export default function ContactsPage() {
  const { t } = useLanguage();

  const infoCards = [
    { icon: Phone, label: t("footer.contacts"), value: "+998 99 998-17-77", href: "tel:+998999981777" },
    { icon: Mail, label: "Email", value: "support@novumtech.uz", href: "mailto:support@novumtech.uz" },
    { icon: Send, label: "Telegram", value: "@novumtechaza", href: "https://t.me/novumtechaza" },
    { icon: Instagram, label: "Instagram", value: "novum_tech", href: "https://instagram.com/novum_tech" },
    { icon: MapPin, label: t("contacts.address_label"), value: t("contacts.address_value") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Контакты IT компании Ташкент — Novum Tech | IT аутсорсинг" description="Свяжитесь с Novum Tech: телефон, email, адрес офиса в Ташкенте. IT аутсорсинг, обслуживание компьютеров, service desk. Бесплатная консультация." canonical="https://novumtech.uz/contacts" />
      <Navbar />
      <main className="pt-16">
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--primary)/0.06),transparent_70%)]" />
          <div className="container mx-auto px-4 lg:px-8 relative">
            <ScrollReveal>
              <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-4">{t("nav.contacts")}</p>
              <h1 className="text-4xl lg:text-[3.25rem] font-bold text-foreground mb-14 leading-[1.1]">{t("contact.title")}</h1>
            </ScrollReveal>

            <div className="grid lg:grid-cols-2 gap-10">
              <ScrollReveal delay={80}>
                <div className="space-y-4">
                  {infoCards.map((card, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-6 flex items-start gap-5 group hover:border-primary/40 transition-all duration-300">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <card.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{card.label}</h3>
                        {card.href ? (
                          <a href={card.href} className="text-muted-foreground hover:text-primary transition-colors">{card.value}</a>
                        ) : (
                          <p className="text-muted-foreground">{card.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <div className="rounded-2xl border border-border bg-card p-7 lg:p-10">
                  <h2 className="text-2xl font-bold text-foreground mb-7">{t("contact.subtitle")}</h2>
                  <ContactForm />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
