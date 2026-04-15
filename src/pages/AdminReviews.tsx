import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

const AdminReviews = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: reviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_approved: approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Обновлено" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Удалено" });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Отзывы</h1>
      <div className="space-y-3">
        {reviews?.map((r) => (
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{r.name}</span>
                  <div className="flex gap-0.5">
                    {[...Array(r.rating || 5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  {r.is_approved ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Опубликован</span>
                  ) : (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">На модерации</span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">{r.text}</p>
                <p className="text-xs text-slate-600 mt-2">{new Date(r.created_at).toLocaleDateString("ru")}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!r.is_approved ? (
                  <Button variant="ghost" size="icon" onClick={() => approveMutation.mutate({ id: r.id, approved: true })}>
                    <Check className="h-4 w-4 text-green-400" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => approveMutation.mutate({ id: r.id, approved: false })}>
                    <X className="h-4 w-4 text-yellow-400" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Удалить?")) deleteMutation.mutate(r.id); }}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {reviews?.length === 0 && <p className="text-slate-500 text-center py-8">Отзывов нет</p>}
      </div>
    </div>
  );
};

export default AdminReviews;
