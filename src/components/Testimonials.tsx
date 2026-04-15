import { Quote } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const testimonials = [
  {
    text: "Работаем с Novum Tech уже более 3 лет. За это время ни одного критического инцидента без решения в рамках SLA. Профессиональная команда, которая понимает бизнес-процессы и всегда на связи.",
    author: "Алишер Каримов",
    role: "Директор IT-отдела",
    initials: "АК",
  },
  {
    text: "Благодарю за оперативную работу! Сервер упал в пятницу вечером — ребята всё восстановили за 2 часа. Теперь спим спокойно.",
    author: "Мухаммад Рахимов",
    role: "Генеральный директор",
    initials: "МР",
  },
  {
    text: "До Novum Tech мучились с постоянными сбоями. После перехода на аутсорсинг — 8 месяцев без единой серьёзной проблемы. Рекомендую!",
    author: "Нигина Саидова",
    role: "Финансовый директор",
    initials: "НС",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-14">
            <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-3">
              Отзывы
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Что говорят наши клиенты
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Более 50 компаний Ташкента уже доверили нам свою IT-инфраструктуру
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((item, index) => (
            <ScrollReveal key={item.author} delay={index * 100}>
              <div className="rounded-2xl border border-border bg-card p-7 lg:p-8 h-full flex flex-col hover:border-primary/30 transition-all duration-300">
                <Quote className="text-primary/40 mb-5" size={32} />
                <p className="text-foreground text-base lg:text-lg leading-relaxed mb-6 flex-grow">
                  "{item.text}"
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">
                      {item.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.author}</p>
                    <p className="text-sm text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
