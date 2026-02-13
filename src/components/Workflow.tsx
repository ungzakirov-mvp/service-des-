import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const steps = [
  { num: "01", title: "Экспресс-аудит IT", desc: "Анализируем текущую инфраструктуру, выявляем узкие места и риски" },
  { num: "02", title: "Формируем предложение", desc: "Составляем план обслуживания и прозрачную смету под ваши задачи" },
  { num: "03", title: "Подключаем и настраиваем", desc: "Внедряем решения, настраиваем мониторинг и резервное копирование" },
  { num: "04", title: "Поддержка и контроль", desc: "Обеспечиваем бесперебойную работу с ежемесячной отчётностью" },
];

const Workflow = () => {
  const ref = useScrollAnimation();

  return (
    <section id="workflow" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Как мы работаем</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Четыре простых шага к стабильной IT-инфраструктуре
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-border -translate-x-4 z-0" />
              )}
              <div className="relative z-10 rounded-xl border border-border bg-card p-6">
                <span className="text-3xl font-bold text-primary/30">{s.num}</span>
                <h3 className="text-lg font-semibold mt-3 mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Workflow;
