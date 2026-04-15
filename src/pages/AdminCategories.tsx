import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, X, Save, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminCategories = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<any>(null);

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("service_categories").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: services } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").order("sort_order");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: any) => {
      const payload = {
        id: item.id,
        label_ru: item.label_ru,
        label_uz: item.label_uz,
        label_en: item.label_en,
        icon: item.icon,
        sort_order: item.sort_order,
        is_active: item.is_active,
      };
      if (editing === "new") {
        const { error } = await supabase.from("service_categories").insert(payload);
        if (error) throw error;
      } else {
        const { id, ...upd } = payload;
        const { error } = await supabase.from("service_categories").update(upd).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setEditing(null);
      setForm(null);
      toast({ title: "Сохранено" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "Удалено" });
    },
  });

  const startNew = () => {
    setEditing("new");
    setForm({
      id: "",
      label_ru: "", label_uz: "", label_en: "",
      icon: "Wrench",
      sort_order: (categories?.length || 0) + 1,
      is_active: true,
    });
  };

  const getServiceCount = (catId: string) => services?.filter(s => s.category === catId).length || 0;

  if (editing && form) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">{editing === "new" ? "Новая категория" : "Редактировать категорию"}</h1>
          <Button variant="ghost" onClick={() => { setEditing(null); setForm(null); }}><X className="h-4 w-4 text-slate-400" /></Button>
        </div>
        <div className="space-y-5 max-w-lg">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">ID (ключ, латиница)</label>
            <Input
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              disabled={editing !== "new"}
              placeholder="network, cctv, printer..."
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {(["ru", "uz", "en"] as const).map((l) => (
            <div key={l}>
              <label className="text-sm text-slate-400 mb-1 block">Название ({l.toUpperCase()})</label>
              <Input value={form[`label_${l}`] || ""} onChange={(e) => setForm({ ...form, [`label_${l}`]: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Иконка</label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Wrench, Monitor, Camera..." className="bg-slate-800 border-slate-700 text-white" />
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
        <h1 className="text-2xl font-bold text-white">Категории услуг</h1>
        <Button onClick={startNew} className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {categories?.map((cat) => (
          <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white">{cat.label_ru}</p>
              <p className="text-sm text-slate-400">ID: {cat.id} · Иконка: {cat.icon} · Услуг: {getServiceCount(cat.id)}</p>
            </div>
            <div className="flex items-center gap-2">
              {!cat.is_active && <span className="text-xs text-slate-500">Скрыта</span>}
              <Button variant="ghost" size="icon" onClick={() => { setEditing(cat.id); setForm({ ...cat }); }}><Pencil className="h-4 w-4 text-slate-400" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Удалить категорию?")) deleteMutation.mutate(cat.id); }}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
        {categories?.length === 0 && <p className="text-slate-500 text-center py-8">Категорий нет</p>}
      </div>
    </div>
  );
};

export default AdminCategories;
