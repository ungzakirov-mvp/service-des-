import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import About from "@/components/About";
import Workflow from "@/components/Workflow";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
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
      <Footer />
    </div>
  );
}
