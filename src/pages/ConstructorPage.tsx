import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getLocalizedField, formatPrice } from '@/i18n/helpers';
import ScrollReveal from '@/components/ScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingCart, Plus, Minus, Trash2, Info, Send, X,
  ChevronDown, ChevronUp,
  Car, Monitor, Terminal, Server, Wifi, Cable, Camera, Printer, Wrench,
  Clock, Network
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Car, Clock, Monitor, Server, Network, Wrench, Camera, Wifi, Cable, Printer, Terminal,
};
function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Wrench;
}
function formatNum(n: number) {
  return n.toLocaleString('ru-RU');
}

interface CartItem {
  serviceId: string;
  serviceKey: string;
  qty: number;
}

export default function ConstructorPage() {
  const { lang, t } = useLanguage();

  // Step 1 fields
  const [workstations, setWorkstations] = useState<number>(0);
  const [months, setMonths] = useState<number>(1);
  const step1Ready = workstations > 0 && months > 0;

  // Categories & services
  const { data: categories } = useQuery({
    queryKey: ['constructor-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('service_categories').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: services } = useQuery({
    queryKey: ['constructor-services'],
    queryFn: async () => {
      const { data } = await supabase.from('services').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // All collapsed by default
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const toggleCat = (id: string) => setOpenCats(prev => ({ ...prev, [id]: !prev[id] }));

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (svc: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.serviceId === svc.id);
      if (existing) return prev.map(i => i.serviceId === svc.id ? { ...i, qty: i.qty + svc.default_qty } : i);
      return [...prev, { serviceId: svc.id, serviceKey: svc.service_key, qty: svc.default_qty }];
    });
  };

  const updateQty = (serviceId: string, qty: number) => {
    if (qty < 1) return removeFromCart(serviceId);
    setCart(prev => prev.map(i => i.serviceId === serviceId ? { ...i, qty } : i));
  };

  const removeFromCart = (serviceId: string) => {
    setCart(prev => prev.filter(i => i.serviceId !== serviceId));
  };

  const getService = (id: string) => services?.find(s => s.id === id);
  const isInCart = (id: string) => cart.some(i => i.serviceId === id);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const svc = getService(item.serviceId);
      return sum + (svc?.price || 0) * item.qty * months;
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, services, months]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Grouped services by category
  const groupedServices = useMemo(() => {
    if (!categories || !services) return [];
    return categories.map(cat => ({
      ...cat,
      items: services.filter(s => s.category === cat.id),
    })).filter(g => g.items.length > 0);
  }, [categories, services]);

  // Lead modal
  const [showModal, setShowModal] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const labels: Record<string, any> = {
    ru: {
      title: 'Конструктор услуг',
      subtitle: 'Укажите параметры и выберите необходимые услуги',
      workstations: 'Количество рабочих мест',
      months: 'Срок (месяцев)',
      fillFirst: 'Заполните параметры выше, чтобы выбрать услуги',
      cart: 'Ваш расчёт',
      total: 'Итого за',
      mo: 'мес.',
      disclaimer: 'Предварительный расчёт. Финальная стоимость уточняется после аудита.',
      empty: 'Выберите услуги из каталога',
      order: 'Оставить заявку',
      name: 'Имя', phone: 'Телефон',
      send: 'Отправить', sending: 'Отправка...',
    },
    uz: {
      title: 'Xizmatlar konstruktori',
      subtitle: "Parametrlarni ko'rsating va kerakli xizmatlarni tanlang",
      workstations: 'Ish joylari soni',
      months: 'Muddat (oy)',
      fillFirst: "Xizmatlarni tanlash uchun yuqoridagi parametrlarni to'ldiring",
      cart: 'Sizning hisobingiz',
      total: 'Jami',
      mo: 'oy',
      disclaimer: 'Dastlabki hisob. Yakuniy narx auditdan keyin aniqlanadi.',
      empty: 'Katalogdan xizmatlarni tanlang',
      order: "So'rov qoldiring",
      name: 'Ism', phone: 'Telefon',
      send: 'Yuborish', sending: 'Yuborilmoqda...',
    },
    en: {
      title: 'Service Constructor',
      subtitle: 'Specify parameters and select the services you need',
      workstations: 'Number of workstations',
      months: 'Duration (months)',
      fillFirst: 'Fill in the parameters above to select services',
      cart: 'Your estimate',
      total: 'Total for',
      mo: 'mo.',
      disclaimer: 'Preliminary estimate. Final cost confirmed after audit.',
      empty: 'Select services from the catalog',
      order: 'Submit Request',
      name: 'Name', phone: 'Phone',
      send: 'Send', sending: 'Sending...',
    },
  };
  const l = labels[lang] || labels.ru;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) return;
    setSubmitting(true);
    try {
      const lines = cart.map(item => {
        const svc = getService(item.serviceId);
        if (!svc) return '';
        return `• ${getLocalizedField(svc, 'name', lang)} × ${item.qty} = ${formatNum(svc.price * item.qty * months)} сум`;
      }).filter(Boolean);
      const message = `Рабочих мест: ${workstations}, Срок: ${months} мес.\n${lines.join('\n')}\nИтого: ${formatNum(cartTotal)} сум`;

      await supabase.functions.invoke('submit-contact', {
        body: { name: leadName.trim(), company: '—', phone: leadPhone.trim(), email: '—', message, honeypot: '' },
      });
      setShowModal(false);
      setCart([]);
      setLeadName('');
      setLeadPhone('');
    } catch {}
    setSubmitting(false);
  };

  return (
    <>
      <SEOHead title="Конструктор IT-услуг — Novum Tech" description="Соберите индивидуальный тариф IT-аутсорсинга: выберите услуги, количество рабочих мест и срок обслуживания." canonical="https://novumtech.uz/constructor" />
      <Navbar />
      <section className="relative py-16 lg:py-24 overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(217,91%,60%,0.06),transparent_70%)]" />
        <div className="container mx-auto px-4 lg:px-8 relative">

          <ScrollReveal>
            <div className="text-center mb-10">
              <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-3">Constructor</p>
              <h1 className="text-3xl lg:text-[2.75rem] font-bold text-foreground mb-3 leading-tight">{l.title}</h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">{l.subtitle}</p>
            </div>
          </ScrollReveal>

          {/* Step 1: Parameters */}
          <ScrollReveal delay={50}>
            <div className="max-w-2xl mx-auto mb-10 rounded-xl border border-border bg-card p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{l.workstations}</label>
                  <Input
                    type="number"
                    min={1}
                    value={workstations || ''}
                    onChange={e => setWorkstations(parseInt(e.target.value) || 0)}
                    placeholder="10"
                    className="text-center text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{l.months}</label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={months || ''}
                    onChange={e => setMonths(parseInt(e.target.value) || 0)}
                    placeholder="12"
                    className="text-center text-lg font-semibold"
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {!step1Ready ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>{l.fillFirst}</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: categories */}
              <div className="lg:col-span-2 space-y-3">
                {groupedServices.map(cat => {
                  const isOpen = !!openCats[cat.id];
                  const CatIcon = getIcon(cat.icon);
                  return (
                    <ScrollReveal key={cat.id}>
                      <div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-300">
                        <button
                          onClick={() => toggleCat(cat.id)}
                          className="w-full flex items-center justify-between px-6 py-4 hover:bg-primary/5 transition-colors"
                        >
                          <span className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                              <CatIcon size={16} className="text-primary" />
                            </div>
                            <span className="font-semibold text-foreground">{getLocalizedField(cat, 'label', lang)}</span>
                            <span className="text-xs text-muted-foreground">({cat.items.length})</span>
                          </span>
                          {isOpen ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                        </button>

                        {isOpen && (
                          <div className="border-t border-border divide-y divide-border">
                            {cat.items.map(svc => {
                              const inCart = isInCart(svc.id);
                              const cartItem = cart.find(i => i.serviceId === svc.id);
                              return (
                                <div
                                  key={svc.id}
                                  className={`flex items-center justify-between px-6 py-3.5 transition-colors ${inCart ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}
                                >
                                  <div className="flex-1 min-w-0 pr-4">
                                    <div className="text-sm font-medium text-foreground truncate">{getLocalizedField(svc, 'name', lang)}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {formatNum(svc.price)} сум / {svc.unit}
                                    </div>
                                  </div>

                                  {inCart && cartItem ? (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button onClick={() => updateQty(svc.id, cartItem.qty - 1)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:border-primary/60 hover:bg-primary/10 transition-colors">
                                        <Minus size={13} />
                                      </button>
                                      <span className="text-sm font-bold text-primary tabular-nums w-8 text-center">{cartItem.qty}</span>
                                      <button onClick={() => updateQty(svc.id, cartItem.qty + 1)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:border-primary/60 hover:bg-primary/10 transition-colors">
                                        <Plus size={13} />
                                      </button>
                                      <div className="text-xs font-medium text-foreground/70 w-24 text-right tabular-nums">
                                        {formatNum(svc.price * cartItem.qty)} сум
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addToCart(svc)}
                                      className="shrink-0 h-8 px-4 text-xs font-medium rounded-lg border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                                    >
                                      +
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>

              {/* Right: cart */}
              <div className="lg:col-span-1">
                <ScrollReveal delay={120}>
                  <div className={`rounded-xl border bg-card p-6 sticky top-24 transition-all duration-300 ${cart.length > 0 ? 'border-primary/40 shadow-[0_0_30px_-12px_hsl(var(--primary)/0.4)]' : 'border-border'}`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{l.cart}</h2>
                        {cartCount > 0 && <span className="text-xs text-muted-foreground">{cartCount} позиций · {months} {l.mo}</span>}
                      </div>
                    </div>

                    {cart.length === 0 ? (
                      <p className="text-sm text-muted-foreground/60 text-center py-6">{l.empty}</p>
                    ) : (
                      <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 mb-5">
                        {cart.map(item => {
                          const svc = getService(item.serviceId);
                          if (!svc) return null;
                          const subtotal = svc.price * item.qty * months;
                          return (
                            <div key={item.serviceId} className="bg-secondary/30 rounded-xl p-3 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-foreground leading-tight flex-1">{getLocalizedField(svc, 'name', lang)}</p>
                                <button onClick={() => removeFromCart(item.serviceId)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{formatNum(svc.price)} × {item.qty} × {months} мес.</span>
                                <span className="font-semibold text-foreground">{formatNum(subtotal)} сум</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {cart.length > 0 && (
                      <>
                        <div className="border-t border-border/20 pt-4 mb-4">
                          <div className="flex justify-between items-baseline">
                            <span className="text-foreground font-semibold">{l.total} {months} {l.mo}</span>
                            <span className="text-xl font-bold text-primary">{formatNum(cartTotal)} сум</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-[11px] text-muted-foreground/60 mb-4">
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <p>{l.disclaimer}</p>
                        </div>

                        <Button onClick={() => setShowModal(true)} className="w-full">
                          {l.order}
                          <Send size={15} className="ml-2" />
                        </Button>
                      </>
                    )}
                  </div>
                </ScrollReveal>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{l.order}</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleOrder} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{l.name}</label>
                <Input value={leadName} onChange={e => setLeadName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{l.phone}</label>
                <Input value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder="+998 ..." maxLength={20} />
              </div>
              <div className="rounded-lg bg-secondary/40 border border-border p-3">
                <div className="text-xs text-muted-foreground mb-1">{l.total} {months} {l.mo}</div>
                <div className="text-sm font-bold text-primary">{formatNum(cartTotal)} сум</div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? l.sending : l.send}
              </Button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
