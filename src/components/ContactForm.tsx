import { useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

interface FormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
}

const initialForm: FormData = { name: "", company: "", email: "", phone: "", message: "" };

const ContactForm = () => {
  const ref = useScrollAnimation();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = "Укажите имя";
    if (!form.company.trim()) e.company = "Укажите компанию";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Укажите корректный email";
    if (!form.phone.trim()) e.phone = "Укажите телефон";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    setTimeout(() => {
      const prev = JSON.parse(localStorage.getItem("novum_leads") || "[]");
      prev.push({ ...form, date: new Date().toISOString() });
      localStorage.setItem("novum_leads", JSON.stringify(prev));

      toast({ title: "Заявка отправлена!", description: "Мы свяжемся с вами в ближайшее время." });
      setForm(initialForm);
      setErrors({});
      setSubmitting(false);
    }, 800);
  };

  const set = (key: keyof FormData, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  return (
    <section id="contact" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8 max-w-2xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Запросить IT-аудит</h2>
          <p className="text-muted-foreground">Оставьте заявку — мы проведём бесплатный экспресс-аудит вашей IT-инфраструктуры</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-8">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Имя *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ваше имя" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Компания *</label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Название компании" />
              {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@company.uz" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Телефон *</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+998 ..." />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Комментарий</label>
            <Textarea value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Опишите вашу задачу или вопрос..." rows={4} />
          </div>
          <Button type="submit" size="lg" className="w-full py-6" disabled={submitting}>
            {submitting ? "Отправка..." : "Отправить заявку"}
            {!submitting && <Send className="ml-2" size={18} />}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;
