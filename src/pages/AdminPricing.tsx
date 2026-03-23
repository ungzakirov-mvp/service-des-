import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, ArrowUp, ArrowDown, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

/* ── Types ────────────────────────────────────────── */
interface PricingPlan {
  id: string;
  plan_key: string;
  name: string;
  price: string;
  unit: string;
  computers: string;
  sla: string;
  tickets: string;
  refills: string;
  extra_features: string[];
  service_desk_basic: boolean;
  service_desk_mobile: boolean;
  highlight: boolean;
  badge: string | null;
  cta_key: string;
  sort_order: number;
  is_active: boolean;
}

interface Service {
  id: string;
  service_key: string;
  category: string;
  name_ru: string;
  name_uz: string;
  name_en: string;
  description_ru: string | null;
  description_uz: string | null;
  description_en: string | null;
  price: number;
  unit: string;
  default_qty: number;
  sort_order: number;
  is_active: boolean;
}

interface ServiceCategory {
  id: string;
  label_ru: string;
  label_uz: string;
  label_en: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

const AdminPricing = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New service form
  const [newService, setNewService] = useState({
    service_key: "", category: "", name_ru: "", name_uz: "", name_en: "",
    price: 0, unit: "шт.", default_qty: 1,
  });
  const [showNewService, setShowNewService] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [plansRes, servicesRes, catsRes] = await Promise.all([
      supabase.from("pricing_plans").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("service_categories").select("*").order("sort_order"),
    ]);
    setPlans((plansRes.data as any[]) || []);
    setServices((servicesRes.data as any[]) || []);
    setCategories((catsRes.data as any[]) || []);
    setLoading(false);
  };

  /* ── Plan editing ────────────────────────────── */
  const updatePlan = (id: string, field: keyof PricingPlan, value: any) => {
    setPlans((prev) => {
      if (field === "highlight" && value === true) {
        const currentHighlighted = prev.find((p) => p.highlight);
        const badgeText = currentHighlighted?.badge || "Рекомендуемый";
        const updated = prev.map((p) =>
          p.id === id
            ? { ...p, highlight: true, badge: badgeText }
            : { ...p, highlight: false, badge: p.id === currentHighlighted?.id ? null : p.badge }
        );
        // Persist all plans that changed highlight/badge
        updated.forEach((p) => {
          const old = prev.find((o) => o.id === p.id);
          if (old && (old.highlight !== p.highlight || old.badge !== p.badge)) {
            supabase.from("pricing_plans").update({ highlight: p.highlight, badge: p.badge }).eq("id", p.id).then();
          }
        });
        return updated;
      }
      if (field === "highlight" && value === false) {
        const updated = prev.map((p) => (p.id === id ? { ...p, highlight: false, badge: null } : p));
        supabase.from("pricing_plans").update({ highlight: false, badge: null }).eq("id", id).then();
        return updated;
      }
      return prev.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    });
  };

  const savePlan = async (plan: PricingPlan) => {
    setSaving(true);
    const { error } = await supabase
      .from("pricing_plans")
      .update({
        name: plan.name,
        price: plan.price,
        unit: plan.unit,
        computers: plan.computers,
        sla: plan.sla,
        tickets: plan.tickets,
        refills: plan.refills,
        highlight: plan.highlight,
        badge: plan.badge,
        is_active: plan.is_active,
        sort_order: plan.sort_order,
      })
      .eq("id", plan.id);
    setSaving(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Сохранено" });
    }
  };

  /* ── Service editing ──────────────────────────── */
  const updateService = (id: string, field: keyof Service, value: any) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const saveService = async (svc: Service) => {
    if (!svc.name_ru.trim()) {
      toast({ title: "Ошибка", description: "Название не может быть пустым", variant: "destructive" });
      return;
    }
    if (svc.price < 0) {
      toast({ title: "Ошибка", description: "Цена не может быть отрицательной", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("services")
      .update({
        name_ru: svc.name_ru.trim(),
        name_uz: svc.name_uz.trim(),
        name_en: svc.name_en.trim(),
        description_ru: svc.description_ru,
        description_uz: svc.description_uz,
        description_en: svc.description_en,
        price: svc.price,
        unit: svc.unit,
        default_qty: svc.default_qty,
        sort_order: svc.sort_order,
        is_active: svc.is_active,
        category: svc.category,
      })
      .eq("id", svc.id);
    setSaving(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Услуга сохранена" });
    }
  };

  const addService = async () => {
    if (!newService.service_key.trim() || !newService.name_ru.trim() || !newService.category) {
      toast({ title: "Заполните все обязательные поля", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("services").insert({
      ...newService,
      sort_order: services.length + 1,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Услуга добавлена" });
      setNewService({ service_key: "", category: "", name_ru: "", name_uz: "", name_en: "", price: 0, unit: "шт.", default_qty: 1 });
      setShowNewService(false);
      fetchAll();
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Удалить услугу?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Услуга удалена" });
    }
  };

  const moveService = async (id: string, direction: "up" | "down") => {
    const idx = services.findIndex((s) => s.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === services.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newServices = [...services];
    const tempOrder = newServices[idx].sort_order;
    newServices[idx].sort_order = newServices[swapIdx].sort_order;
    newServices[swapIdx].sort_order = tempOrder;
    [newServices[idx], newServices[swapIdx]] = [newServices[swapIdx], newServices[idx]];
    setServices(newServices);
    await Promise.all([
      supabase.from("services").update({ sort_order: newServices[idx].sort_order }).eq("id", newServices[idx].id),
      supabase.from("services").update({ sort_order: newServices[swapIdx].sort_order }).eq("id", newServices[swapIdx].id),
    ]);
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Загрузка...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Тарифы и услуги</h1>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="plans" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400">
            Тарифные планы
          </TabsTrigger>
          <TabsTrigger value="services" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400">
            Услуги (конструктор)
          </TabsTrigger>
        </TabsList>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-4 mt-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white">{plan.name}</CardTitle>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400">Активен</label>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={(v) => updatePlan(plan.id, "is_active", v)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Название</label>
                    <Input
                      value={plan.name}
                      onChange={(e) => updatePlan(plan.id, "name", e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Цена</label>
                    <Input
                      value={plan.price}
                      onChange={(e) => updatePlan(plan.id, "price", e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Рабочих мест</label>
                    <Input
                      value={plan.computers}
                      onChange={(e) => updatePlan(plan.id, "computers", e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">SLA</label>
                    <Input
                      value={plan.sla}
                      onChange={(e) => updatePlan(plan.id, "sla", e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Заявки</label>
                    <Input
                      value={plan.tickets}
                      onChange={(e) => updatePlan(plan.id, "tickets", e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Заправки</label>
                    <Input
                      value={plan.refills}
                      onChange={(e) => updatePlan(plan.id, "refills", e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Бейдж</label>
                    <Input
                      value={plan.badge || ""}
                      onChange={(e) => updatePlan(plan.id, "badge", e.target.value || null)}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                      placeholder="Рекомендуемый"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">Выделить</label>
                      <Switch
                        checked={plan.highlight}
                        onCheckedChange={(v) => updatePlan(plan.id, "highlight", v)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => savePlan(plan)}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save size={14} className="mr-1" />
                    Сохранить
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* SERVICES TAB */}
        <TabsContent value="services" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">{services.length} услуг</p>
            <Button
              size="sm"
              onClick={() => setShowNewService(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={14} className="mr-1" /> Добавить услугу
            </Button>
          </div>

          {/* Add new service form */}
          {showNewService && (
            <Card className="bg-slate-800 border-blue-600/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white">Новая услуга</CardTitle>
                  <button onClick={() => setShowNewService(false)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ключ *</label>
                    <Input
                      value={newService.service_key}
                      onChange={(e) => setNewService({ ...newService, service_key: e.target.value })}
                      placeholder="new_service"
                      className="bg-slate-900 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Категория *</label>
                    <select
                      value={newService.category}
                      onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                      className="w-full h-10 rounded-md bg-slate-900 border border-slate-700 text-white text-sm px-3"
                    >
                      <option value="">Выберите</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.label_ru}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Цена</label>
                    <Input
                      type="number"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ед. измерения</label>
                    <Input
                      value={newService.unit}
                      onChange={(e) => setNewService({ ...newService, unit: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Название (RU) *</label>
                    <Input
                      value={newService.name_ru}
                      onChange={(e) => setNewService({ ...newService, name_ru: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Название (UZ)</label>
                    <Input
                      value={newService.name_uz}
                      onChange={(e) => setNewService({ ...newService, name_uz: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Название (EN)</label>
                    <Input
                      value={newService.name_en}
                      onChange={(e) => setNewService({ ...newService, name_en: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewService(false)} className="text-slate-400">
                    Отмена
                  </Button>
                  <Button size="sm" onClick={addService} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    Добавить
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-500 w-10">#</TableHead>
                    <TableHead className="text-slate-500">Название (RU)</TableHead>
                    <TableHead className="text-slate-500">Название (UZ)</TableHead>
                    <TableHead className="text-slate-500">Название (EN)</TableHead>
                    <TableHead className="text-slate-500">Категория</TableHead>
                    <TableHead className="text-slate-500">Цена</TableHead>
                    <TableHead className="text-slate-500">Ед.</TableHead>
                    <TableHead className="text-slate-500 w-10">Вкл</TableHead>
                    <TableHead className="text-slate-500 w-32">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((svc, idx) => {
                    const cat = categories.find((c) => c.id === svc.category);
                    return (
                      <TableRow key={svc.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="text-slate-500 text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={svc.name_ru}
                            onChange={(e) => updateService(svc.id, "name_ru", e.target.value)}
                            className="bg-transparent border-slate-700 text-white text-xs h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={svc.name_uz}
                            onChange={(e) => updateService(svc.id, "name_uz", e.target.value)}
                            className="bg-transparent border-slate-700 text-white text-xs h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={svc.name_en}
                            onChange={(e) => updateService(svc.id, "name_en", e.target.value)}
                            className="bg-transparent border-slate-700 text-white text-xs h-8"
                          />
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">{cat?.label_ru || svc.category}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={svc.price}
                            onChange={(e) => updateService(svc.id, "price", Number(e.target.value))}
                            className="bg-transparent border-slate-700 text-white text-xs h-8 w-28"
                          />
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">{svc.unit}</TableCell>
                        <TableCell>
                          <Switch
                            checked={svc.is_active}
                            onCheckedChange={(v) => updateService(svc.id, "is_active", v)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveService(svc.id, "up")}
                              className="p-1 text-slate-500 hover:text-white"
                              disabled={idx === 0}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              onClick={() => moveService(svc.id, "down")}
                              className="p-1 text-slate-500 hover:text-white"
                              disabled={idx === services.length - 1}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => saveService(svc)}
                              disabled={saving}
                              className="h-7 px-2 text-blue-400 hover:text-blue-300"
                            >
                              <Save size={13} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteService(svc.id)}
                              className="h-7 px-2 text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPricing;
