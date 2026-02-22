import { useState, useMemo, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { LucideIcon } from "lucide-react";
import {
  Plus, Minus, X, Send, ChevronDown, ChevronUp,
  Car, Clock, Monitor, Server, Network, Wrench, Camera,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Unit = string;

interface ServiceItem {
  id: string;
  name_ru: string;
  name_uz: string;
  name_en: string;
  price: number;
  unit: Unit;
  defaultQty: number;
}

interface Category {
  id: string;
  label_ru: string;
  label_uz: string;
  label_en: string;
  icon: string;
  items: ServiceItem[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  Car, Clock, Monitor, Server, Network, Wrench, Camera,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Wrench;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function formatNum(n: number) {
  return n.toLocaleString("ru-RU");
}

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits.length ? `+${digits}` : "";
  if (digits.length <= 5) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 7) return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  if (digits.length <= 9)
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8)}`;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
};

/* ─── Component ───────────────────────────────────────────────────────────── */
const TariffBuilder = () => {
  const ref = useScrollAnimation();
  const { toast } = useToast();
  const { t, lang } = useLanguage();

  const [categories, setCategories] = useState<Category[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [showModal, setShowModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [catsRes, svcsRes] = await Promise.all([
        supabase.from("service_categories").select("*").order("sort_order"),
        supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
      ]);
      const cats = (catsRes.data || []) as any[];
      const svcs = (svcsRes.data || []) as any[];
      const mapped: Category[] = cats.map((c) => ({
        id: c.id,
        label_ru: c.label_ru,
        label_uz: c.label_uz,
        label_en: c.label_en,
        icon: c.icon,
        items: svcs
          .filter((s) => s.category === c.id)
          .map((s) => ({
            id: s.service_key,
            name_ru: s.name_ru,
            name_uz: s.name_uz || s.name_ru,
            name_en: s.name_en || s.name_ru,
            price: Number(s.price),
            unit: s.unit,
            defaultQty: s.default_qty,
          })),
      }));
      setCategories(mapped);
      setDbLoaded(true);
    };
    load();
  }, []);

  const toggleCategory = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const addItem = (item: ServiceItem) => {
    setSelected((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] ?? 0) + item.defaultQty,
    }));
  };

  const setQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setSelected((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setSelected((prev) => ({ ...prev, [id]: qty }));
    }
  };

  const getItemName = (item: ServiceItem) => {
    if (lang === "uz") return item.name_uz;
    if (lang === "en") return item.name_en;
    return item.name_ru;
  };

  const getCatLabel = (cat: Category) => {
    if (lang === "uz") return cat.label_uz;
    if (lang === "en") return cat.label_en;
    return cat.label_ru;
  };

  const allItems = useMemo(
    () => categories.flatMap((c) => c.items),
    [categories]
  );

  const { total, lineItems } = useMemo(() => {
    const lineItems = allItems
      .filter((item) => selected[item.id] !== undefined)
      .map((item) => ({
        ...item,
        qty: selected[item.id],
        subtotal: item.price * selected[item.id],
      }));
    const total = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
    return { total, lineItems };
  }, [selected, allItems]);

  const hasItems = lineItems.length > 0;

  const buildMessage = () => {
    const lines = lineItems.map(
      (li) =>
        `  • ${getItemName(li)} × ${li.qty} ${li.unit} = ${formatNum(li.subtotal)} ${t("builder.sum")}`
    );
    return (
      `Конструктор тарифа:\n${lines.join("\n")}\n` +
      `${t("builder.total")}: ${formatNum(total)} ${t("builder.sum")}`
    );
  };

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
          message: buildMessage(),
          honeypot: "",
        },
      });
      toast({ title: t("common.sent"), description: t("common.sent_desc") });
      setShowModal(false);
      setLeadName("");
      setLeadPhone("");
      setLeadCompany("");
    } catch {
      toast({ title: t("contact.error"), description: t("common.error_retry"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="tariff-builder" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("builder.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("builder.subtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* LEFT — service categories */}
          <div className="lg:col-span-2 space-y-4">
            {categories.map((cat) => {
              const isOpen = !collapsed[cat.id];
              const CatIcon = getIcon(cat.icon);
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-primary/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <CatIcon size={16} className="text-primary" />
                      </div>
                      <span className="font-semibold text-foreground">{getCatLabel(cat)}</span>
                    </span>
                    {isOpen ? (
                      <ChevronUp size={18} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={18} className="text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {cat.items.map((item) => {
                        const qty = selected[item.id] ?? 0;
                        const isAdded = qty > 0;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between px-6 py-3.5 transition-colors ${
                              isAdded ? "bg-primary/5" : "hover:bg-secondary/30"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="text-sm font-medium text-foreground truncate">
                                {getItemName(item)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatNum(item.price)} {t("builder.sum")} / {item.unit}
                              </div>
                            </div>

                            {isAdded ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => setQty(item.id, qty - item.defaultQty)}
                                  className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:border-primary/60 hover:bg-primary/10 transition-colors"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="text-sm font-bold text-primary tabular-nums w-8 text-center">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => setQty(item.id, qty + item.defaultQty)}
                                  className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:border-primary/60 hover:bg-primary/10 transition-colors"
                                >
                                  <Plus size={13} />
                                </button>
                                <div className="text-xs font-medium text-foreground/70 w-24 text-right tabular-nums">
                                  {formatNum(item.price * qty)} {t("builder.sum")}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => addItem(item)}
                                className="shrink-0 h-8 px-4 text-xs font-medium rounded-lg border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                              >
                                {t("builder.add")}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT — total */}
          <div className="sticky top-6">
            <div
              className={`rounded-xl border bg-card p-6 transition-all duration-300 ${
                hasItems
                  ? "border-primary/40 shadow-[0_0_30px_-12px_hsl(var(--primary)/0.4)]"
                  : "border-border"
              }`}
            >
              <div className="text-xs font-semibold tracking-widest uppercase text-primary mb-5">
                {t("builder.your_calc")}
              </div>

              {!hasItems ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🛒</div>
                  <p className="text-sm text-muted-foreground">{t("builder.empty_hint")}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {lineItems.map((li) => (
                      <div key={li.id} className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground/90 leading-tight">
                            {getItemName(li)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {li.qty} {li.unit} × {formatNum(li.price)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold tabular-nums text-foreground">
                            {formatNum(li.subtotal)}
                          </span>
                          <button
                            onClick={() => setQty(li.id, 0)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-border mb-4" />

                  <div className="flex items-baseline justify-between mb-6">
                    <span className="text-sm font-medium text-muted-foreground">{t("builder.total")}</span>
                    <span className="text-2xl font-bold text-primary tabular-nums transition-all duration-300">
                      {formatNum(total)} {t("builder.sum")}
                    </span>
                  </div>
                </>
              )}

              <Button
                className="w-full"
                disabled={!hasItems}
                onClick={() => setShowModal(true)}
              >
                {t("builder.request_kp")}
                <Send size={15} className="ml-2" />
              </Button>

              {!hasItems && (
                <p className="text-center text-xs text-muted-foreground mt-3">{t("builder.add_one")}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t("builder.modal_title")}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("builder.name")}</label>
                <Input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder={t("builder.your_name")}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("builder.phone")}</label>
                <Input
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(formatPhone(e.target.value))}
                  placeholder="+998 ..."
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("builder.company")}</label>
                <Input
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                  placeholder={t("builder.company_name")}
                />
              </div>

              <div className="rounded-lg bg-secondary/40 border border-border p-3">
                <div className="text-xs text-muted-foreground mb-1">{t("builder.total_calc")}</div>
                <div className="text-sm font-bold text-primary">{formatNum(total)} {t("builder.sum")}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {lineItems.length} {t("builder.services_selected")}
                </div>
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

export default TariffBuilder;
