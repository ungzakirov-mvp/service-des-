import { useState, useMemo } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, X, Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Price List ─────────────────────────────────────────────────────────── */
type Unit = "шт." | "час" | "м.";

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  unit: Unit;
  defaultQty: number;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  items: ServiceItem[];
}

const CATEGORIES: Category[] = [
  {
    id: "visit",
    label: "Выезд специалиста",
    icon: "🚗",
    items: [
      { id: "visit_tashkent", name: "Выезд по Ташкенту", price: 150_000, unit: "шт.", defaultQty: 1 },
      { id: "visit_hour", name: "1 час работы", price: 350_000, unit: "час", defaultQty: 1 },
    ],
  },
  {
    id: "pc",
    label: "ПК и ноутбуки",
    icon: "💻",
    items: [
      { id: "pc_windows", name: "Установка Windows", price: 250_000, unit: "шт.", defaultQty: 1 },
      { id: "pc_virus", name: "Проверка на вирусы", price: 150_000, unit: "шт.", defaultQty: 1 },
      { id: "pc_restore", name: "Восстановление ПК", price: 200_000, unit: "шт.", defaultQty: 1 },
      { id: "pc_backup", name: "Резервное копирование", price: 170_000, unit: "шт.", defaultQty: 1 },
    ],
  },
  {
    id: "server",
    label: "Серверные решения",
    icon: "🖥️",
    items: [
      { id: "srv_linux", name: "Установка Linux/Unix", price: 450_000, unit: "шт.", defaultQty: 1 },
      { id: "srv_winsrv", name: "Windows Server + DNS/DHCP", price: 1_100_000, unit: "шт.", defaultQty: 1 },
      { id: "srv_ad", name: "Active Directory", price: 1_500_000, unit: "шт.", defaultQty: 1 },
      { id: "srv_vpn", name: "OpenVPN", price: 1_000_000, unit: "шт.", defaultQty: 1 },
      { id: "srv_zabbix", name: "Zabbix сервер", price: 1_200_000, unit: "шт.", defaultQty: 1 },
    ],
  },
  {
    id: "network",
    label: "Сетевое оборудование",
    icon: "🔌",
    items: [
      { id: "net_switch", name: "Коммутатор", price: 600_000, unit: "шт.", defaultQty: 1 },
      { id: "net_router", name: "Маршрутизатор", price: 600_000, unit: "шт.", defaultQty: 1 },
      { id: "net_wifi", name: "Wi-Fi точка", price: 500_000, unit: "шт.", defaultQty: 1 },
    ],
  },
  {
    id: "cabling",
    label: "Монтаж СКС",
    icon: "🔧",
    items: [
      { id: "sks_cable", name: "Прокладка кабеля", price: 12_000, unit: "м.", defaultQty: 10 },
      { id: "sks_socket", name: "Монтаж розетки", price: 80_000, unit: "шт.", defaultQty: 1 },
      { id: "sks_rack", name: "Монтаж шкафа 42U", price: 2_500_000, unit: "шт.", defaultQty: 1 },
    ],
  },
  {
    id: "cctv",
    label: "Видеонаблюдение",
    icon: "📹",
    items: [
      { id: "cctv_cam", name: "Монтаж камеры", price: 400_000, unit: "шт.", defaultQty: 1 },
      { id: "cctv_cam_high", name: "Монтаж камеры выше 3м", price: 600_000, unit: "шт.", defaultQty: 1 },
      { id: "cctv_dvr", name: "Монтаж и настройка видеорегистратора", price: 650_000, unit: "шт.", defaultQty: 1 },
    ],
  },
];

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

  // selected: itemId → qty
  const [selected, setSelected] = useState<Record<string, number>>({});
  // collapsed categories
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  // Flatten all items for lookup
  const allItems = useMemo(
    () => CATEGORIES.flatMap((c) => c.items),
    []
  );

  // Compute total
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
        `  • ${li.name} × ${li.qty} ${li.unit} = ${formatNum(li.subtotal)} сум`
    );
    return (
      `Конструктор тарифа:\n${lines.join("\n")}\n` +
      `Итого: ${formatNum(total)} сум`
    );
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim() || !leadCompany.trim()) {
      toast({ title: "Заполните все поля", variant: "destructive" });
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
      toast({ title: "Заявка отправлена!", description: "Мы свяжемся с вами в ближайшее время." });
      setShowModal(false);
      setLeadName("");
      setLeadPhone("");
      setLeadCompany("");
    } catch {
      toast({ title: "Ошибка", description: "Попробуйте ещё раз.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="tariff-builder" className="py-20 md:py-28">
      <div ref={ref} className="section-fade-in container mx-auto px-4 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Сконструируйте свой тариф
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Выберите нужные услуги из прайс-листа — стоимость рассчитается автоматически
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* LEFT — service categories */}
          <div className="lg:col-span-2 space-y-4">
            {CATEGORIES.map((cat) => {
              const isOpen = !collapsed[cat.id];
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-300"
                >
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-primary/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-semibold text-foreground">{cat.label}</span>
                    </span>
                    {isOpen ? (
                      <ChevronUp size={18} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={18} className="text-muted-foreground" />
                    )}
                  </button>

                  {/* Items */}
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
                                {item.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatNum(item.price)} сум / {item.unit}
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
                                  {formatNum(item.price * qty)} сум
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => addItem(item)}
                                className="shrink-0 h-8 px-4 text-xs font-medium rounded-lg border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                              >
                                + Добавить
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
                Ваш расчёт
              </div>

              {!hasItems ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🛒</div>
                  <p className="text-sm text-muted-foreground">
                    Добавьте услуги из прайс-листа, и стоимость рассчитается автоматически
                  </p>
                </div>
              ) : (
                <>
                  {/* Line items */}
                  <div className="space-y-3 mb-5">
                    {lineItems.map((li) => (
                      <div key={li.id} className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground/90 leading-tight">
                            {li.name}
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

                  {/* Divider */}
                  <div className="h-px bg-border mb-4" />

                  {/* Total */}
                  <div className="flex items-baseline justify-between mb-6">
                    <span className="text-sm font-medium text-muted-foreground">Итого</span>
                    <span className="text-2xl font-bold text-primary tabular-nums transition-all duration-300">
                      {formatNum(total)} сум
                    </span>
                  </div>
                </>
              )}

              <Button
                className="w-full"
                disabled={!hasItems}
                onClick={() => setShowModal(true)}
              >
                Запросить коммерческое предложение
                <Send size={15} className="ml-2" />
              </Button>

              {!hasItems && (
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Добавьте хотя бы одну услугу
                </p>
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
              <h3 className="text-lg font-bold">Запросить КП</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Имя *</label>
                <Input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Ваше имя"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Телефон *</label>
                <Input
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(formatPhone(e.target.value))}
                  placeholder="+998 ..."
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Компания *</label>
                <Input
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                  placeholder="Название компании"
                />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-secondary/40 border border-border p-3">
                <div className="text-xs text-muted-foreground mb-1">Итого по расчёту</div>
                <div className="text-sm font-bold text-primary">{formatNum(total)} сум</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {lineItems.length} услуг(и) выбрано
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={submitting}>
                {submitting ? "Отправка..." : "Отправить"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default TariffBuilder;
