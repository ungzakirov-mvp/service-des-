import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";

const Hero = () => {
  const scrollTo = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 text-center max-w-4xl">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-border bg-secondary/50 text-xs text-muted-foreground tracking-wide uppercase">
          IT-аутсорсинг в Ташкенте
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
          IT-аутсорсинг{" "}
          <span className="text-primary">для бизнеса</span>{" "}
          в Ташкенте
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Берём полную ответственность за IT-инфраструктуру: стабильность, безопасность и контроль для компаний 20–100 сотрудников
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="text-base px-8 py-6" onClick={() => scrollTo("#contact")}>
            Запросить IT-аудит
            <ArrowRight className="ml-2" size={18} />
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8 py-6" onClick={() => scrollTo("#services")}>
            Узнать больше
          </Button>
        </div>
      </div>

      <button
        onClick={() => scrollTo("#trust")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground transition-colors animate-bounce"
        aria-label="Прокрутить вниз"
      >
        <ChevronDown size={28} />
      </button>
    </section>
  );
};

export default Hero;
