import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getLocalizedField, formatPrice } from '@/i18n/helpers';
import ScrollReveal from '@/components/ScrollReveal';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Plus, Minus, Trash2, Info,
  Car, Monitor, Terminal, Server, Wifi, Cable, Camera, Printer,
  Search, X
} from 'lucide-react';

const categoryConfig: Record<string, { icon: any; ru: string; uz: string; en: string }> = {
  visit:   { icon: Car,      ru: 'Выезд специалиста',  uz: 'Mutaxassis chiqishi',    en: 'On-site visit' },
  pc:      { icon: Monitor,  ru: 'ПК / ноутбуки',      uz: 'Kompyuter / noutbuklar', en: 'PC / Laptops' },
  linux:   { icon: Terminal, ru: 'Linux / Unix',        uz: 'Linux / Unix',           en: 'Linux / Unix' },
  windows: { icon: Server,   ru: 'Windows Server',      uz: 'Windows Server',         en: 'Windows Server' },
  network: { icon: Wifi,     ru: 'Сеть и телеком',      uz: 'Tarmoq va telekom',      en: 'Network & Telecom' },
  cable:   { icon: Cable,    ru: 'Кабельные сети',      uz: 'Kabel tarmoqlari',       en: 'Cable networks' },
  cctv:    { icon: Camera,   ru: 'Видеонаблюдение',     uz: 'Videokuzatuv',           en: 'CCTV' },
  printer: { icon: Printer,  ru: 'Принтеры / МФУ',      uz: 'Printerlar / MFU',       en: 'Printers / MFP' },
};

const categoryOrder = ['visit', 'pc', 'linux', 'windows', 'network', 'cable', 'cctv', 'printer'];

interface CartItem {
  serviceId: string;
  qty: number;
  repeats: number;
}

export default function ConstructorPage() {
  const { lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');

  const { data: services } = useQuery({
    queryKey: ['constructor-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data || [];
    },
  });

  const categories = useMemo(() => {
    if (!services) return [];
    const cats = new Set(services.map(s => s.category));
    return categoryOrder.filter(c => cats.has(c));
  }, [services]);

  const filtered = useMemo(() => {
    if (!services) return [];
    let list = services;
    if (activeCategory) list = list.filter(s => s.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => {
        const name = getLocalizedField(s, 'name', lang).toLowerCase();
        const desc = getLocalizedField(s, 'description', lang).toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }
    return list;
  }, [services, activeCategory, search, lang]);

  const addToCart = (serviceId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.serviceId === serviceId);
      if (existing) return prev.map(i => i.serviceId === serviceId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { serviceId, qty: 1, repeats: 1 }];
    });
  };

  const updateQty = (serviceId: string, qty: number) => {
    if (qty < 1) return removeFromCart(serviceId);
    setCart(prev => prev.map(i => i.serviceId === serviceId ? { ...i, qty } : i));
  };

  const updateRepeats = (serviceId: string, repeats: number) => {
    if (repeats < 1) repeats = 1;
    setCart(prev => prev.map(i => i.serviceId === serviceId ? { ...i, repeats } : i));
  };

  const removeFromCart = (serviceId: string) => {
    setCart(prev => prev.filter(i => i.serviceId !== serviceId));
  };

  const getService = (id: string) => services?.find(s => s.id === id);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const svc = getService(item.serviceId);
      return sum + (svc?.price || 0) * item.qty * item.repeats;
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, services]);

  const isInCart = (id: string) => cart.some(i => i.serviceId === id);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const labels = {
    ru: { title: 'Конструктор услуг', subtitle: 'Выберите необходимые услуги и рассчитайте стоимость', search: 'Поиск услуг...', cart: 'Ваш заказ', qty: 'Кол-во', repeats: 'Повторов', total: 'Общая сумма', disclaimer: 'Предварительный расчёт. Финальная стоимость уточняется после аудита.', empty: 'Выберите услуги из каталога', added: 'В корзине', add: 'Добавить', all: 'Все', order: 'Оставить заявку' },
    uz: { title: 'Xizmatlar konstruktori', subtitle: 'Kerakli xizmatlarni tanlang va narxni hisoblang', search: 'Xizmatlarni qidirish...', cart: 'Sizning buyurtmangiz', qty: 'Soni', repeats: 'Takror', total: 'Umumiy summa', disclaimer: 'Dastlabki hisob-kitob. Yakuniy narx auditdan keyin aniqlanadi.', empty: 'Katalogdan xizmatlarni tanlang', added: 'Savatda', add: "Qo'shish", all: 'Hammasi', order: "So'rov qoldiring" },
    en: { title: 'Service Constructor', subtitle: 'Select services and calculate the cost', search: 'Search services...', cart: 'Your order', qty: 'Qty', repeats: 'Repeats', total: 'Total', disclaimer: 'Preliminary estimate. Final cost confirmed after audit.', empty: 'Select services from the catalog', added: 'In cart', add: 'Add', all: 'All', order: 'Submit Request' },
  };
  const l = labels[lang] || labels.ru;

  const handleOrder = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(217,91%,60%,0.06),transparent_70%)]" />
      <div className="container mx-auto px-4 lg:px-8 relative">

        <ScrollReveal>
          <div className="text-center mb-10">
            <p className="text-primary text-xs font-semibold tracking-widest uppercase mb-3">Constructor</p>
            <h1 className="text-3xl lg:text-[2.75rem] font-bold text-foreground mb-3 leading-tight">{l.title}</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{l.subtitle}</p>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: catalog */}
          <div className="lg:col-span-2 space-y-5">
            <ScrollReveal delay={50}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={l.search}
                  className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-card/50 border border-border/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={80}>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    !activeCategory
                      ? 'bg-primary text-primary-foreground shadow-[0_0_16px_-4px_hsl(217,91%,60%,0.3)]'
                      : 'bg-card/50 border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/50'
                  }`}
                >
                  {l.all}
                </button>
                {categories.map(cat => {
                  const cfg = categoryConfig[cat];
                  const Icon = cfg?.icon || Server;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        activeCategory === cat
                          ? 'bg-primary text-primary-foreground shadow-[0_0_16px_-4px_hsl(217,91%,60%,0.3)]'
                          : 'bg-card/50 border border-border/30 text-muted-foreground hover:text-foreground hover:border-border/50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg ? cfg[lang] || cfg.ru : cat}
                    </button>
                  );
                })}
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered?.map((svc, i) => {
                const inCart = isInCart(svc.id);
                return (
                  <ScrollReveal key={svc.id} delay={i * 40}>
                    <div className={`card-premium glass rounded-xl p-5 h-full flex flex-col group transition-all duration-300 ${
                      inCart ? 'border-primary/30 shadow-[0_0_20px_-6px_hsl(217,91%,60%,0.15)]' : ''
                    }`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground leading-tight">{getLocalizedField(svc, 'name', lang)}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{getLocalizedField(svc, 'description', lang)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-3 border-t border-border/20">
                        <span className="text-lg font-bold text-primary">{formatPrice(svc.price, lang)}</span>
                        <span className="text-xs text-muted-foreground">/ {svc.unit}</span>
                      </div>

                      <button
                        onClick={() => addToCart(svc.id)}
                        className={`mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 active:scale-[0.97] ${
                          inCart
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-primary text-primary-foreground hover:shadow-[0_0_20px_-4px_hsl(217,91%,60%,0.3)]'
                        }`}
                      >
                        {inCart ? `✓ ${l.added}` : l.add}
                      </button>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>

            {filtered?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {search ? `Ничего не найдено по "${search}"` : 'Услуги не найдены'}
              </div>
            )}
          </div>

          {/* Right: cart sidebar */}
          <div className="lg:col-span-1">
            <ScrollReveal delay={120}>
              <div className="card-premium glass rounded-2xl p-6 sticky top-24 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{l.cart}</h2>
                    {cartCount > 0 && <span className="text-xs text-muted-foreground">{cartCount}</span>}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 text-center py-6">{l.empty}</p>
                ) : (
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {cart.map(item => {
                      const svc = getService(item.serviceId);
                      if (!svc) return null;
                      const subtotal = svc.price * item.qty * item.repeats;
                      return (
                        <div key={item.serviceId} className="bg-secondary/30 rounded-xl p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground leading-tight flex-1">{getLocalizedField(svc, 'name', lang)}</p>
                            <button onClick={() => removeFromCart(item.serviceId)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase">{l.qty}</span>
                              <div className="inline-flex items-center bg-card/80 rounded-lg border border-border/30">
                                <button onClick={() => updateQty(item.serviceId, item.qty - 1)} className="px-2 py-1 text-muted-foreground hover:text-foreground"><Minus className="h-3 w-3" /></button>
                                <span className="px-2 text-sm font-medium text-foreground min-w-[24px] text-center">{item.qty}</span>
                                <button onClick={() => updateQty(item.serviceId, item.qty + 1)} className="px-2 py-1 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase">×</span>
                              <div className="inline-flex items-center bg-card/80 rounded-lg border border-border/30">
                                <button onClick={() => updateRepeats(item.serviceId, item.repeats - 1)} className="px-2 py-1 text-muted-foreground hover:text-foreground"><Minus className="h-3 w-3" /></button>
                                <span className="px-2 text-sm font-medium text-foreground min-w-[24px] text-center">{item.repeats}</span>
                                <button onClick={() => updateRepeats(item.serviceId, item.repeats + 1)} className="px-2 py-1 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></button>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{formatPrice(svc.price, lang)} × {item.qty} × {item.repeats}</span>
                            <span className="font-semibold text-foreground">{formatPrice(subtotal, lang)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {cart.length > 0 && (
                  <>
                    <div className="border-t border-border/20 pt-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-foreground font-semibold">{l.total}</span>
                        <span className="text-xl font-bold text-gradient">{formatPrice(cartTotal, lang)}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-[11px] text-muted-foreground/60">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <p>{l.disclaimer}</p>
                    </div>

                    <Button onClick={handleOrder} className="w-full">
                      {l.order}
                    </Button>
                  </>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
