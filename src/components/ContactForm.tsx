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

    const planInfo = form.selected_plan
      ? `\nИнтересующий тариф: ${form.selected_plan}`
      : "";
    const fullMessage = (form.message.trim() + planInfo).trim() || undefined;

    try {
      const { data, error } = await supabase.functions.invoke("submit-contact", {
        body: {
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: fullMessage,
          honeypot,
        },
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || "Error");

      toast({ title: t("contact.success"), description: t("contact.success_desc") });
      setForm(initialForm);
      setErrors({});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("contact.error");
      toast({ title: t("contact.error"), description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: keyof FormData, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const selectedPlanLabel = PLANS.find((p) => p.value === form.selected_plan)?.label;

  return (
    <section id="contact" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8 max-w-2xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("contact.title")}</h2>
          <p className="text-muted-foreground">{t("contact.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-8">
          {/* Honeypot */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("contact.name")}</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("contact.your_name")} maxLength={100} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("contact.company")}</label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder={t("contact.company_name")} maxLength={200} />
              {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("contact.email")}</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@company.uz" maxLength={255} />
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

          {/* Tariff select */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("contact.plan")}</label>
            <Select value={form.selected_plan} onValueChange={(val) => set("selected_plan", val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("contact.plan_none")} />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map((plan) => (
                  <SelectItem key={plan.value} value={plan.value}>
                    {plan.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t("contact.plan_hint")}</p>

            {form.selected_plan && selectedPlanLabel && (
              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 transition-all duration-300 animate-in fade-in slide-in-from-top-1">
                <p className="text-sm font-medium text-primary">
                  {t("contact.plan_selected")} {form.selected_plan}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("contact.plan_personal")}</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("contact.comment")}</label>
            <Textarea value={form.message} onChange={(e) => set("message", e.target.value)} placeholder={t("contact.comment_placeholder")} rows={4} maxLength={2000} />
          </div>

          <Button type="submit" size="lg" className="w-full py-6" disabled={submitting}>
            {submitting ? t("contact.submitting") : t("contact.submit")}
            {!submitting && <Send className="ml-2" size={18} />}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;
