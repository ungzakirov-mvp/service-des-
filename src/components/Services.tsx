import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Server, ShieldCheck, Monitor, KeyRound,
  ShieldAlert, Printer, Bug, Flame,
  HardDrive, Cloud, Lock, Mail,
  Eye, Network
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const Services = () => {
  const ref = useScrollAnimation();
  const ref2 = useScrollAnimation();
  const { t } = useLanguage();

  const services = [
    {
      icon: Server,
      title: t("services.server"),
      subtitle: t("services.server_sub"),
      desc: t("services.server_desc"),
    },
    {
      icon: ShieldCheck,
      title: t("services.security"),
      subtitle: t("services.security_sub"),
      desc: t("services.security_desc"),
    },
    {
      icon: Monitor,
      title: t("services.workstation"),
      subtitle: t("services.workstation_sub"),
      desc: t("services.workstation_desc"),
    },
  ];

  const licenseCategories = [
    {
      group: t("services.software"),
      items: [
        { icon: KeyRound, name: t("services.ms365") },
        { icon: Mail, name: t("services.email") },
        { icon: Cloud, name: t("services.cloud") },
      ],
    },
    {
      group: t("services.security_cat"),
      items: [
        { icon: Bug, name: t("services.antivirus") },
        { icon: ShieldAlert, name: t("services.dlp") },
        { icon: Eye, name: t("services.siem") },
      ],
    },
    {
      group: t("services.infra"),
      items: [
        { icon: Flame, name: t("services.firewall") },
        { icon: HardDrive, name: t("services.backup") },
        { icon: Printer, name: t("services.print") },
        { icon: Network, name: t("services.network") },
      ],
    },
  ];

  return (
    <section id="services" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("services.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("services.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((s) => (
            <div
              key={s.title}
              className="group rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.3)]"
            >
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <s.icon className="text-primary" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-primary mb-3">{s.subtitle}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Licenses subsection */}
      <div ref={ref2} className="section-fade-in container mx-auto px-4 lg:px-8 mt-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("services.licenses_title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("services.licenses_subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {licenseCategories.map((cat) => (
            <div key={cat.group} className="rounded-xl border border-border bg-card p-8">
              <h3 className="text-lg font-semibold mb-6 text-primary">{cat.group}</h3>
              <div className="space-y-4">
                {cat.items.map((item) => (
                  <div key={item.name} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="text-primary" size={20} />
                    </div>
                    <span className="text-sm text-foreground/90 pt-2">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
