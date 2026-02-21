import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const Hero = () => {
  const { t } = useLanguage();
  const scrollTo = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt="Современный дата-центр с серверами"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/50 to-background" />
      </div>

      <div className="relative z-10 container mx-auto px-4 lg:px-8 text-center max-w-4xl">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-border bg-secondary/50 text-xs text-muted-foreground tracking-wide uppercase">
          {t("hero.badge")}
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
          {t("hero.title1")}{" "}
          <span className="text-primary">{t("hero.title2")}</span>{" "}
          {t("hero.title3")}
        </h1>

        <p className="text-xl sm:text-2xl text-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          {t("hero.desc")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="text-base px-8 py-6" onClick={() => scrollTo("#contact")}>
            {t("hero.cta")}
            <ArrowRight className="ml-2" size={18} />
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8 py-6" onClick={() => scrollTo("#services")}>
            {t("hero.more")}
          </Button>
        </div>
      </div>

      <button
        onClick={() => scrollTo("#trust")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-muted-foreground hover:text-foreground transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown size={28} />
      </button>
    </section>
  );
};

export default Hero;
