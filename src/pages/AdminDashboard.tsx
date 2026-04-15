import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, CreditCard, MessageSquare } from "lucide-react";

const AdminDashboard = () => {
  const { data: visitStats } = useQuery({
    queryKey: ["admin-visit-stats"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthStart = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase.from("site_visits").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("site_visits").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
        supabase.from("site_visits").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      ]);
      return { today: todayRes.count ?? 0, week: weekRes.count ?? 0, month: monthRes.count ?? 0 };
    },
  });

  const { data: requestCount } = useQuery({
    queryKey: ["admin-request-count"],
    queryFn: async () => {
      const { count } = await supabase.from("contact_requests").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: planCount } = useQuery({
    queryKey: ["admin-plan-count"],
    queryFn: async () => {
      const { count } = await supabase.from("pricing_plans").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const cards = [
    { label: "Визиты сегодня", value: visitStats?.today ?? 0, icon: BarChart3 },
    { label: "За 7 дней", value: visitStats?.week ?? 0, icon: Users },
    { label: "Заявок", value: requestCount ?? 0, icon: MessageSquare },
    { label: "Тарифов", value: planCount ?? 0, icon: CreditCard },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Обзор</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{card.label}</CardTitle>
              <card.icon size={18} className="text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
