import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const About = () => {
  const ref = useScrollAnimation();
  const { t } = useLanguage();

  const advantages = [
    t("about.adv1"),
    t("about.adv2"),
    t("about.adv3"),
    t("about.adv4"),
    t("about.adv5"),
    t("about.adv6"),
  ];

  return (
    <section id="about" className="py-20 md:py-28 bg-secondary/20">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">{t("about.title")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <span className="text-foreground font-semibold">Novum Tech</span> {t("about.p1")}
            </p>
            <p className="text-muted-foreground leading-relaxed">{t("about.p2")}</p>
          </div>

          <div className="space-y-4">
            {advantages.map((a) => (
              <div key={a} className="flex items-start gap-3">
                <CheckCircle2 className="text-primary mt-0.5 shrink-0" size={20} />
                <span className="text-sm text-foreground/90">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
