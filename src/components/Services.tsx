import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Server, ShieldCheck, Monitor } from "lucide-react";

const services = [
  {
    icon: Server,
    title: "Server Management",
    subtitle: "Серверные решения",
    desc: "Проектирование, настройка и сопровождение серверной инфраструктуры. Мониторинг 24/7, резервное копирование и отказоустойчивость.",
  },
  {
    icon: ShieldCheck,
    title: "IT Security Audit",
    subtitle: "Безопасность IT",
    desc: "Комплексный аудит безопасности, выявление уязвимостей, настройка защиты данных и соответствие стандартам информационной безопасности.",
  },
  {
    icon: Monitor,
    title: "Workstation Support",
    subtitle: "Поддержка оборудования",
    desc: "Обслуживание и настройка рабочих станций, установка ПО, оперативное решение проблем пользователей и техническая поддержка.",
  },
];

const Services = () => {
  const ref = useScrollAnimation();

  return (
    <section id="services" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Наши услуги</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Комплексное IT-обслуживание для стабильной работы вашего бизнеса
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((s) => (
            <div
              key={s.title}
              className="group rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.3)]"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <s.icon className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-primary mb-3">{s.subtitle}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
