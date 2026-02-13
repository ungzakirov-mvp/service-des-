import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Что такое IT-аутсорсинг и зачем он нужен?",
    a: "IT-аутсорсинг — это передача IT-задач внешней команде специалистов. Это позволяет сократить расходы на штатных IT-сотрудников, повысить качество обслуживания и сосредоточиться на основном бизнесе.",
  },
  {
    q: "Для каких компаний подходят ваши услуги?",
    a: "Мы работаем с компаниями от 20 до 100 сотрудников в Ташкенте. Это оптимальный масштаб, при котором IT-аутсорсинг значительно выгоднее содержания собственного IT-отдела.",
  },
  {
    q: "Как быстро вы реагируете на инциденты?",
    a: "Время реакции на критические инциденты — до 30 минут. Мы используем системы мониторинга 24/7 и часто устраняем проблемы ещё до того, как вы их заметите.",
  },
  {
    q: "Что входит в SLA 99.9%?",
    a: "SLA 99.9% гарантирует, что ваша IT-инфраструктура будет доступна 99.9% времени. Это включает мониторинг, резервное копирование, оперативное устранение сбоев и плановое обслуживание.",
  },
  {
    q: "Как происходит переход на аутсорсинг?",
    a: "Процесс начинается с бесплатного IT-аудита. Мы анализируем текущую инфраструктуру, составляем план, согласовываем его с вами и плавно переводим обслуживание без простоев.",
  },
  {
    q: "Какова стоимость IT-аутсорсинга?",
    a: "Стоимость зависит от количества сотрудников, состава оборудования и требуемых услуг. После бесплатного аудита мы предоставим прозрачную смету без скрытых платежей.",
  },
];

const FAQ = () => {
  const ref = useScrollAnimation();

  return (
    <section className="py-20 md:py-28 bg-secondary/20">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8 max-w-3xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Частые вопросы</h2>
          <p className="text-muted-foreground">Ответы на популярные вопросы об IT-аутсорсинге</p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-lg border border-border bg-card px-6 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-left hover:no-underline py-5 text-base">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
