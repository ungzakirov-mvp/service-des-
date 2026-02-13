import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Shield, Users, Clock, BarChart3 } from "lucide-react";

const items = [
  { icon: Shield, label: "SLA 99.9%", desc: "Гарантия доступности" },
  { icon: Users, label: "20–100 сотрудников", desc: "Идеальный масштаб" },
  { icon: Clock, label: "Реакция до 30 мин", desc: "Оперативная поддержка" },
  { icon: BarChart3, label: "Прозрачная отчётность", desc: "Полный контроль" },
];

const TrustIndicators = () => {
  const ref = useScrollAnimation();

  return (
    <section id="trust" className="py-12 border-y border-border bg-secondary/30">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col items-center text-center gap-2">
              <item.icon className="text-primary mb-1" size={28} />
              <span className="text-lg font-semibold text-foreground">{item.label}</span>
              <span className="text-sm text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustIndicators;
