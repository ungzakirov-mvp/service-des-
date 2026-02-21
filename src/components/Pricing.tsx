import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import {
  Check,
  Star,
  MessageSquare,
  Hash,
  Activity,
  Clock,
  Bell,
  Smartphone,
  Shield,
  Zap,
  Eye,
  ThumbsUp,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/* ─────────────────── Main component ─────────────────── */

const Pricing = () => {
  const ref = useScrollAnimation();
  const whyRef = useScrollAnimation();
  const trustRef = useScrollAnimation();
  const { t } = useLanguage();

  const plans = [
    {
      id: "micro",
      name: "MICRO",
      price: "4 500 000",
      unit: t("pricing.per_month"),
      computers: t("pricing.workstations") === "Workstations" ? "Up to 5 PCs" : "До 5 ПК",
      sla: "SLA 8h",
      tickets: "8",
      refills: "3",
      extraFeatures: [t("plan.remote_support")],
      serviceDeskBasic: false,
      serviceDeskMobile: false,
      cta: t("plan.start_work"),
      highlight: false,
    },
    {
      id: "start",
      name: "START",
      price: "9 000 000",
      unit: t("pricing.per_month"),
      computers: t("pricing.workstations") === "Workstations" ? "Up to 20 PCs" : "До 20 ПК",
      sla: "SLA 4h",
      tickets: "25",
      refills: "6",
      extraFeatures: [t("plan.priority_support")],
      serviceDeskBasic: true,
      serviceDeskMobile: false,
      cta: t("plan.connect_sd"),
      highlight: false,
    },
    {
      id: "business",
      name: "BUSINESS",
      price: "14 000 000",
      unit: t("pricing.per_month"),
      computers: t("pricing.workstations") === "Workstations" ? "Up to 40 PCs" : "До 40 ПК",
      sla: "SLA 2–4h",
      tickets: "45",
      refills: "10",
      extraFeatures: [t("plan.priority_visit")],
      serviceDeskBasic: true,
      serviceDeskMobile: true,
      cta: t("plan.connect_sd"),
      highlight: false,
    },
    {
      id: "enterprise",
      name: "ENTERPRISE",
      price: "21 000 000",
      unit: t("pricing.per_month"),
      computers: t("pricing.workstations") === "Workstations" ? "Up to 60 PCs" : "До 60 ПК",
      sla: "SLA 2h",
      tickets: "65",
      refills: "14",
      extraFeatures: [t("plan.max_priority")],
      serviceDeskBasic: true,
      serviceDeskMobile: true,
      cta: t("plan.connect_sd"),
      highlight: false,
    },
    {
      id: "pro",
      name: "PRO",
      price: "от 45 000 000",
      unit: t("pricing.per_month"),
      computers: t("pricing.workstations") === "Workstations" ? "Up to 75 PCs" : "До 75 ПК",
      sla: "SLA 1h",
      tickets: "70",
      refills: "∞",
      extraFeatures: [
        t("plan.engineer"),
        t("plan.full_control"),
        t("plan.cctv_mount"),
        t("plan.cctv_dvr"),
        t("plan.cctv_service"),
      ],
      serviceDeskBasic: true,
      serviceDeskMobile: true,
      cta: t("pricing.get_support"),
      highlight: true,
      badge: t("pricing.recommended"),
    },
  ];

  const whyItems = [
    { icon: Activity, title: t("pricing.why_control"), desc: t("pricing.why_control_desc") },
    { icon: Zap, title: t("pricing.why_fast"), desc: t("pricing.why_fast_desc") },
    { icon: Eye, title: t("pricing.why_transparent"), desc: t("pricing.why_transparent_desc") },
    { icon: Smartphone, title: t("pricing.why_convenient"), desc: t("pricing.why_convenient_desc") },
  ];

  const trustItems = [
    t("pricing.trust_1"),
    t("pricing.trust_2"),
    t("pricing.trust_3"),
    t("pricing.trust_4"),
    t("pricing.trust_5"),
  ];

  const handleCta = () => {
    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const MetaStat = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</span>
      <span className="text-sm font-semibold text-foreground leading-tight mt-0.5">{value}</span>
    </div>
  );

  const ServiceDeskBlock = ({ mobile }: { mobile: boolean }) => (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4">
      <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Shield size={11} />
        {t("pricing.sd_included")}
      </p>
      <ul className="space-y-1.5">
        {[
          { icon: MessageSquare, label: t("pricing.sd_telegram") },
          { icon: Hash, label: t("pricing.sd_number") },
          { icon: Activity, label: t("pricing.sd_status") },
          { icon: Clock, label: t("pricing.sd_history") },
          { icon: Bell, label: t("pricing.sd_notify") },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5 text-[12px] text-foreground/80">
            <Icon size={11} className="text-primary shrink-0" />
            {label}
          </li>
        ))}
        {mobile &&
          [
            { icon: Smartphone, label: t("pricing.sd_mobile") },
            { icon: Bell, label: t("pricing.sd_push") },
            { icon: Activity, label: t("pricing.sd_manage") },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5 text-[12px] text-foreground/80">
              <Icon size={11} className="text-primary shrink-0" />
              {label}
            </li>
          ))}
      </ul>
    </div>
  );

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8">
        {/* Selling header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-4 px-3 py-1 rounded-full border border-primary/30 bg-primary/10">
            <Shield size={12} />
            {t("pricing.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
            {t("pricing.title")}<br className="hidden sm:block" /> {t("pricing.title2")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">{t("pricing.subtitle")}</p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={`
                relative flex flex-col rounded-xl border
                transition-all duration-300 cursor-default
                hover:-translate-y-2
                hover:shadow-[0_16px_40px_-12px_hsl(var(--primary)/0.35)]
                ${plan.highlight
                  ? "border-primary bg-card ring-2 ring-primary/60 lg:scale-105 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.5)]"
                  : "border-border bg-card hover:border-primary/40"
                }
                p-5
              `}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full shadow-lg">
                    <Star size={10} fill="currentColor" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <h3 className={`text-sm font-bold tracking-widest uppercase mb-3 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`}>
                {plan.name}
              </h3>

              <div className="mb-4">
                <div className="text-xl font-bold leading-tight text-foreground">{plan.price}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{plan.unit}</div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mb-4 p-3 rounded-lg bg-secondary/40 border border-border/50">
                <MetaStat label={t("pricing.workstations")} value={plan.computers} />
                <MetaStat label="SLA" value={plan.sla} />
                <MetaStat label={t("pricing.tickets")} value={plan.tickets} />
                <MetaStat label={t("pricing.refills")} value={plan.refills} />
              </div>

              {plan.serviceDeskBasic && <ServiceDeskBlock mobile={plan.serviceDeskMobile} />}

              <div className="h-px bg-border mb-4" />

              <ul className="space-y-2.5 flex-1 mb-5">
                {plan.extraFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                    <Check size={14} className={`shrink-0 mt-0.5 ${plan.highlight ? "text-primary" : "text-primary/70"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="sm"
                variant={plan.highlight ? "default" : "outline"}
                className={`w-full transition-all duration-200 ${
                  plan.highlight
                    ? "hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.6)]"
                    : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                }`}
                onClick={handleCta}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Why Service Desk */}
        <div ref={whyRef} className="section-fade-in mt-20">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">{t("pricing.why_title")}</h3>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm">{t("pricing.why_subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyItems.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3
                           transition-all duration-300 hover:-translate-y-1 hover:border-primary/40
                           hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.3)]"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust block */}
        <div ref={trustRef} className="section-fade-in mt-14">
          <div className="rounded-2xl border border-border bg-card/60 px-6 py-8 sm:px-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ThumbsUp size={22} className="text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-base sm:text-lg text-foreground mb-3">{t("pricing.trust_title")}</h4>
                <ul className="flex flex-wrap gap-x-6 gap-y-2">
                  {trustItems.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-foreground/80">
                      <Check size={13} className="text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <Button size="sm" onClick={handleCta} className="whitespace-nowrap">
                  {t("pricing.get_support")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
