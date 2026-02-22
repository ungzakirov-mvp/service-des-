import { useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

interface FormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  selected_plan: string;
}

const initialForm: FormData = { name: "", company: "", email: "", phone: "", message: "", selected_plan: "" };

const PLANS = [
  { value: "MICRO", label: "MICRO — до 5 ПК (4 500 000 сум)" },
  { value: "START", label: "START — до 20 ПК (9 000 000 сум)" },
  { value: "BUSINESS", label: "BUSINESS — до 40 ПК (14 000 000 сум)" },
  { value: "ENTERPRISE", label: "ENTERPRISE — до 60 ПК (21 000 000 сум)" },
  { value: "PRO", label: "PRO — инженер в офисе, до 75 ПК (от 45 000 000 сум)" },
];

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits.length ? `+${digits}` : "";
  if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 7) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8)}`;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
};

const ContactForm = () => {
  const ref = useScrollAnimation();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = t("contact.err_name");
    if (form.name.trim().length > 100) e.name = t("contact.err_name_long");
    if (!form.company.trim()) e.company = t("contact.err_company");
    if (form.company.trim().length > 200) e.company = t("contact.err_company_long");
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t("contact.err_email");
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 9) e.phone = t("contact.err_phone");
    if (form.message && form.message.length > 2000) e.message = t("contact.err_message");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const planInfo = form.selected_plan ? `\nИнтересующий тариф: ${form.selected_plan}` : "";
      const fullMessage = (form.message.trim() + planInfo).trim();

      const { data, error: fnError } = await supabase.functions.invoke("submit-contact", {
        body: {
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: fullMessage,
          selected_plan: form.selected_plan,
          honeypot,
        },
      });

      if (fnError) throw new Error(fnError.message || "Ошибка отправки");


      toast({ title: t("contact.success"), description: t("contact.success_desc") });
      setForm(initialForm);
      setErrors({});
    } catch (err: any) {
      toast({
        title: t("contact.error"),
        description: err?.message || "Ошибка отправки",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof FormData, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-secondary/20">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8 max-w-2xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">{t("contact.title")}</h2>
          <p className="text-muted-foreground">{t("contact.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-5">
          {/* Honeypot */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("contact.name")}</label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("contact.your_name")}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("contact.company")}</label>
              <Input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder={t("contact.company_name")}
              />
              {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("contact.email")}</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("contact.phone")}</label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", formatPhone(e.target.value))}
                placeholder="+998 ..."
                maxLength={20}
              />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("contact.plan")}</label>
            <Select value={form.selected_plan} onValueChange={(v) => set("selected_plan", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("contact.plan_none")} />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">{t("contact.plan_hint")}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("contact.comment")}</label>
            <Textarea
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder={t("contact.comment_placeholder")}
              rows={3}
            />
            {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("contact.submitting") : t("contact.submit")}
            {!submitting && <Send size={15} className="ml-2" />}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;
