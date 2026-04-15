import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, X, Save, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminServices = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<any>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState({ id: "", label_ru: "", label_uz: "", label_en: "", icon: "Wrench", sort_order: 0 });

  const { data: services } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("service_categories").select("*").order("sort_order");
      return data || [];
    },
  });

  const saveCatMutation = useMutation({
    mutationFn: async (cat: any) => {
      const { error } = await supabase.from("service_categories").insert(cat);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setShowNewCat(false);
      setNewCat({ id: "", label_ru: "", label_uz: "", label_en: "", icon: "Wrench", sort_order: 0 });
      toast({ title: "Категория создана" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      const { created_at, updated_at, ...rest } = item;
      if (editing === "new") {
        delete rest.id;
        const { error } = await supabase.from("services").insert(rest);
        if (error) throw error;
      } else {
        const { id, ...upd } = rest;
        const { error } = await supabase.from("services").update(upd).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      setEditing(null);
      setForm(null);
      toast({ title: "Сохранено" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      toast({ title: "Удалено" });
    },
  });

  const startNew = () => {
    setEditing("new");
    setForm({
      service_key: "", category: "", category_icon: "Wrench",
      name_ru: "", name_uz: "", name_en: "",
      description_ru: "", description_uz: "", description_en: "",
      price: 0, unit: "шт.", default_qty: 1,
      is_active: true, sort_order: (services?.length || 0) + 1,
    });
  };

  if (editing && form) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">{editing === "new" ? "Новая услуга" : "Редактировать"}</h1>
          <Button variant="ghost" onClick={() => { setEditing(null); setForm(null); }}><X className="h-4 w-4 text-slate-400" /></Button>
        </div>
        <div className="space-y-5 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Service Key</label>
              <Input value={form.service_key} onChange={(e) => setForm({ ...form, service_key: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Категория</label>
              <div className="flex gap-2">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="flex-1 h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white">
                  <option value="">Выберите</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.label_ru}</option>)}
                </select>
                <Button type="button" size="icon" variant="outline" className="border-slate-700 text-slate-400 hover:text-white shrink-0" onClick={() => setShowNewCat(true)}>
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {showNewCat && (
            <div className="bg-slate-800 border border-blue-500/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-blue-400">Новая категория</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">ID (латиница)</label>
                  <Input value={newCat.id} onChange={(e) => setNewCat({ ...newCat, id: e.target.value })} className="bg-slate-900 border-slate-700 text-white" placeholder="network" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Иконка</label>
                  <Input value={newCat.icon} onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">RU</label>
                  <Input value={newCat.label_ru} onChange={(e) => setNewCat({ ...newCat, label_ru: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">UZ</label>
                  <Input value={newCat.label_uz} onChange={(e) => setNewCat({ ...newCat, label_uz: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">EN</label>
                  <Input value={newCat.label_en} onChange={(e) => setNewCat({ ...newCat, label_en: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => saveCatMutation.mutate(newCat)} disabled={!newCat.id || !newCat.label_ru}>
                  <Save className="h-3 w-3 mr-1" /> Создать
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewCat(false)} className="text-slate-400">Отмена</Button>
              </div>
            </div>
          )}

          {(["ru", "uz", "en"] as const).map((l) => (
            <div key={l} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-blue-400 uppercase">{l}</h3>
              <div>
                <label className="text-xs text-slate-500">Название</label>
                <Input value={form[`name_${l}`] || ""} onChange={(e) => setForm({ ...form, [`name_${l}`]: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Описание</label>
                <Input value={form[`description_${l}`] || ""} onChange={(e) => setForm({ ...form, [`description_${l}`]: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Цена</label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Единица</label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Порядок</label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Активна
          </label>

          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" /> Сохранить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Услуги</h1>
        <Button onClick={startNew} className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {services?.map((svc) => (
          <div key={svc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white">{svc.name_ru}</p>
              <p className="text-sm text-slate-400">{svc.category} · {svc.price.toLocaleString()} {svc.unit}</p>
            </div>
            <div className="flex items-center gap-2">
              {!svc.is_active && <span className="text-xs text-slate-500">Скрыт</span>}
              <Button variant="ghost" size="icon" onClick={() => { setEditing(svc.id); setForm({ ...svc }); }}><Pencil className="h-4 w-4 text-slate-400" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Удалить?")) deleteMutation.mutate(svc.id); }}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
        {services?.length === 0 && <p className="text-slate-500 text-center py-8">Услуг нет</p>}
      </div>
    </div>
  );
};

export default AdminServices;
