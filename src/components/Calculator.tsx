import { useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, Zap, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits.length ? `+${digits}` : "";
  if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 7) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8)}`;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
};

type Priority = "standard" | "high" | "max";
const STAFF_COST = 18_000_000;

function calcPlan(pcs: number, engineer: boolean): { name: string; price: number; priceLabel: string } {
  if (engineer) return { name: "PRO", price: 45_000_000, priceLabel: "от 45 000 000 сум / мес" };
  if (pcs <= 5) return { name: "MICRO", price: 4_500_000, priceLabel: "4 500 000 сум / мес" };
  if (pcs <= 20) return { name: "START", price: 9_000_000, priceLabel: "9 000 000 сум / мес" };
  if (pcs <= 40) return { name: "BUSINESS", price: 14_000_000, priceLabel: "14 000 000 сум / мес" };
  return { name: "ENTERPRISE", price: 21_000_000, priceLabel: "21 000 000 сум / мес" };
}

function formatNum(n: number) {
  return n.toLocaleString("ru-RU");
}

const Calculator = () => {
  const ref = useScrollAnimation();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [pcs, setPcs] = useState(10);
  const [printers, setPrinters] = useState(2);
  const [engineer, setEngineer] = useState(false);
  const [priority, setPriority] = useState<Priority>("standard");

  const [showModal, setShowModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const plan = calcPlan(pcs, engineer);
  const saving = Math.max(0, STAFF_COST - plan.price);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim() || !leadCompany.trim()) {
      toast({ title: t("common.fill_all"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await supabase.functions.invoke("submit-contact", {
        body: {
          name: leadName.trim(),
          company: leadCompany.trim(),
          phone: leadPhone.trim(),
          email: "—",
          message: `Калькулятор: тариф ${plan.name}, ПК: ${pcs}, принтеры: ${printers}, инженер: ${engineer ? "да" : "нет"}, приоритет: ${priority}`,
          honeypot: "",
        },
      });
      toast({ title: t("common.sent"), description: t("common.sent_desc") });
      setShowModal(false);
      setLeadName(""); setLeadPhone(""); setLeadCompany("");
    } catch {
      toast({ title: t("contact.error"), description: t("common.error_retry"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="calculator" className="py-20 md:py-28 bg-secondary/20">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8 max-w-5xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("calc.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("calc.subtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* LEFT — controls */}
          <div className="rounded-xl border border-border bg-card p-8 space-y-8">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium">{t("calc.pcs")}</label>
                <span className="text-primary font-bold text-lg tabular-nums">{pcs}</span>
              </div>
              <Slider min={1} max={60} step={1} value={[pcs]} onValueChange={([v]) => setPcs(v)} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5"><span>1</span><span>60</span></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium">{t("calc.printers")}</label>
                <span className="text-primary font-bold text-lg tabular-nums">{printers}</span>
              </div>
              <Slider min={0} max={10} step={1} value={[printers]} onValueChange={([v]) => setPrinters(v)} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5"><span>0</span><span>10</span></div>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-b border-border">
              <div>
                <div className="text-sm font-medium">{t("calc.engineer")}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t("calc.engineer_desc")}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${!engineer ? "text-foreground" : "text-muted-foreground"}`}>{t("calc.no")}</span>
                <Switch checked={engineer} onCheckedChange={setEngineer} />
                <span className={`text-xs ${engineer ? "text-primary font-medium" : "text-muted-foreground"}`}>{t("calc.yes")}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">{t("calc.priority")}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["standard", "high", "max"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-all duration-200 ${
                      priority === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {p === "standard" ? t("calc.standard") : p === "high" ? t("calc.high") : t("calc.max")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — result */}
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-primary/40 bg-card p-8 flex-1">
              <div className="text-xs font-semibold tracking-widest uppercase text-primary mb-5">{t("calc.result")}</div>
              <div className="mb-6">
                <div className="text-muted-foreground text-sm mb-1">{t("calc.recommended")}</div>
                <div className="text-2xl font-bold text-foreground transition-all duration-300">{plan.name}</div>
              </div>
              <div className="h-px bg-border mb-6" />
              <div className="mb-6">
                <div className="text-muted-foreground text-sm mb-1">{t("calc.monthly")}</div>
                <div className="text-3xl font-bold text-primary transition-all duration-300">{plan.priceLabel}</div>
              </div>
              {saving > 0 && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 flex items-center gap-3">
                  <TrendingDown size={20} className="text-primary shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-primary">{t("calc.saving")}</div>
                    <div className="text-sm font-bold text-foreground">{formatNum(saving)} {t("calc.per_month")}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap size={16} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">{t("calc.saving_info")}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("calc.saving_desc")}{" "}
                    <span className="text-foreground font-medium">{t("calc.saving_desc2")}</span>
                    {t("calc.saving_desc3")}
                  </p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setShowModal(true)}>
                {t("calc.get_offer")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("calc.get_offer")}</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("builder.name")}</label>
                <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder={t("builder.your_name")} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("builder.phone")}</label>
                <Input value={leadPhone} onChange={(e) => setLeadPhone(formatPhone(e.target.value))} placeholder="+998 ..." maxLength={20} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("builder.company")}</label>
                <Input value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} placeholder={t("builder.company_name")} />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={submitting}>
                {submitting ? t("builder.sending") : t("builder.send")}
              </Button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Calculator;
