import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

interface FormData {
  name: string;
  phone: string;
  message: string;
}

const initialForm: FormData = { name: "", phone: "", message: "" };

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits.length ? `+${digits}` : "";
  if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 7) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8)}`;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
};

const ContactForm = () => {
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
      const { data, error: fnError } = await supabase.functions.invoke("submit-contact", {
        body: {
          name: form.name.trim(),
          company: "—",
          email: "—",
          phone: form.phone.trim(),
          message: form.message.trim(),
          selected_plan: "",
          honeypot,
        },
      });

      if (fnError) throw new Error(fnError.message || "Ошибка отправки");
      if (data && !data.success) throw new Error(data.error || "Ошибка отправки");

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
    <form onSubmit={handleSubmit} className="space-y-5">
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
        <label className="text-sm font-medium mb-1.5 block">{t("contact.phone")}</label>
        <Input
          value={form.phone}
          onChange={(e) => set("phone", formatPhone(e.target.value))}
          placeholder="+998 ..."
          maxLength={20}
        />
        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
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
  );
};

export default ContactForm;
