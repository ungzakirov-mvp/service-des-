import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { CheckCircle2 } from "lucide-react";

const advantages = [
  "SLA 99.9% — гарантированная доступность инфраструктуры",
  "Прозрачная ежемесячная отчётность по всем работам",
  "Реакция на критические инциденты до 30 минут",
  "Команда сертифицированных IT-специалистов",
  "Индивидуальный подход к каждому клиенту",
  "Масштабируемые решения под рост бизнеса",
];

const About = () => {
  const ref = useScrollAnimation();

  return (
    <section id="about" className="py-20 md:py-28 bg-secondary/20">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">О компании</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <span className="text-foreground font-semibold">Novum Tech</span> — IT-аутсорсинговая компания в Ташкенте, специализирующаяся на полном обслуживании IT-инфраструктуры для среднего бизнеса.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Мы берём на себя все IT-задачи, чтобы вы могли сосредоточиться на развитии бизнеса. От серверов до рабочих станций — ваша инфраструктура под надёжным контролем.
            </p>
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
