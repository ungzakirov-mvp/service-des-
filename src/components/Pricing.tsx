import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const plans = [
  {
    id: "micro",
    name: "MICRO",
    price: "4 500 000",
    unit: "сум / месяц",
    features: [
      "До 5 компьютеров",
      "8 заявок в месяц",
      "SLA до 8 часов",
      "3 заправки принтера",
      "Удаленная и выездная поддержка",
    ],
    cta: "Оставить заявку",
    highlight: false,
  },
  {
    id: "start",
    name: "START",
    price: "9 000 000",
    unit: "сум / месяц",
    features: [
      "До 20 компьютеров",
      "25 заявок",
      "SLA до 4 часов",
      "6 заправок",
      "Приоритетная поддержка",
    ],
    cta: "Оставить заявку",
    highlight: false,
  },
  {
    id: "business",
    name: "BUSINESS",
    price: "14 000 000",
    unit: "сум / месяц",
    features: [
      "До 40 компьютеров",
      "45 заявок",
      "SLA 2–4 часа",
      "10 заправок",
      "Приоритетный выезд",
    ],
    cta: "Оставить заявку",
    highlight: false,
  },
  {
    id: "enterprise",
    name: "ENTERPRISE",
    price: "21 000 000",
    unit: "сум / месяц",
    features: [
      "До 60 компьютеров",
      "65 заявок",
      "SLA 2 часа",
      "14 заправок",
      "Максимальный приоритет",
    ],
    cta: "Оставить заявку",
    highlight: false,
  },
  {
    id: "pro",
    name: "PRO DIRECTION",
    price: "от 30 000 000",
    unit: "сум / месяц",
    features: [
      "Инженер постоянно в офисе",
      "До 50 компьютеров",
      "SLA 1 час",
      "70 заявок",
      "Полный контроль IT",
    ],
    cta: "Получить предложение",
    highlight: true,
  },
];

const Pricing = () => {
  const ref = useScrollAnimation();

  const handleCta = () => {
    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Тарифные планы IT-поддержки</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Выберите оптимальный уровень поддержки для вашего бизнеса
          </p>
        </div>

        {/* Cards grid — 5 cols desktop, 1 col mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={`
                relative flex flex-col rounded-xl border transition-all duration-300
                hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.4)]
                ${
                  plan.highlight
                    ? "border-primary bg-card ring-2 ring-primary/60 lg:scale-105 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.5)]"
                    : "border-border bg-card hover:border-primary/40"
                }
                p-6
              `}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Premium badge */}
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-md">
                    <Star size={10} fill="currentColor" />
                    Premium
                  </span>
                </div>
              )}

              {/* Name */}
              <h3
                className={`text-sm font-bold tracking-widest uppercase mb-4 ${
                  plan.highlight ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                <div className="text-xl font-bold leading-tight text-foreground">
                  {plan.price}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{plan.unit}</div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border mb-5" />

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/85">
                    <Check
                      size={15}
                      className={`shrink-0 mt-0.5 ${plan.highlight ? "text-primary" : "text-primary/70"}`}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                size="sm"
                variant={plan.highlight ? "default" : "outline"}
                className="w-full"
                onClick={handleCta}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
