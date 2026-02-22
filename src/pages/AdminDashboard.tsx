import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Users, Monitor, Smartphone } from "lucide-react";

interface VisitStats {
  today: number;
  week: number;
  month: number;
}

interface Visit {
  id: string;
  created_at: string;
  page: string;
  referrer: string | null;
  device_type: string | null;
}

interface DailyCount {
  date: string;
  count: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<VisitStats>({ today: 0, week: 0, month: 0 });
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [deviceStats, setDeviceStats] = useState({ desktop: 0, mobile: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 86400000).toISOString();

    const [todayRes, weekRes, monthRes, recentRes, monthDataRes] = await Promise.all([
      supabase.from("site_visits").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("site_visits").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
      supabase.from("site_visits").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      supabase.from("site_visits").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("site_visits").select("created_at, device_type").gte("created_at", monthStart),
    ]);

    setStats({
      today: todayRes.count ?? 0,
      week: weekRes.count ?? 0,
      month: monthRes.count ?? 0,
    });

    setRecentVisits((recentRes.data as Visit[]) || []);

    // Calculate daily counts and device stats
    const visits = monthDataRes.data || [];
    let desktop = 0, mobile = 0;
    const dayMap: Record<string, number> = {};

    visits.forEach((v: any) => {
      const day = v.created_at?.slice(0, 10);
      if (day) dayMap[day] = (dayMap[day] || 0) + 1;
      if (v.device_type === "mobile") mobile++;
      else desktop++;
    });

    const sorted = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    setDailyCounts(sorted);
    setDeviceStats({ desktop, mobile });
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Загрузка...</div>;
  }

  const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Дашборд посещений</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Сегодня", value: stats.today, icon: BarChart3 },
          { label: "7 дней", value: stats.week, icon: Users },
          { label: "30 дней", value: stats.month, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{label}</CardTitle>
              <Icon size={18} className="text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Device stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Посещения по дням</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyCounts.length === 0 ? (
              <p className="text-slate-500 text-sm">Нет данных</p>
            ) : (
              <div className="flex items-end gap-1 h-40">
                {dailyCounts.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{d.count}</span>
                    <div
                      className="w-full bg-blue-600 rounded-t"
                      style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: 2 }}
                    />
                    <span className="text-[9px] text-slate-600 rotate-45 origin-left whitespace-nowrap">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Устройства</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Monitor size={20} className="text-blue-400" />
              <div className="flex-1">
                <div className="text-sm text-slate-300">Desktop</div>
                <div className="text-xl font-bold text-white">{deviceStats.desktop}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-green-400" />
              <div className="flex-1">
                <div className="text-sm text-slate-300">Mobile</div>
                <div className="text-xl font-bold text-white">{deviceStats.mobile}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent visits */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm text-slate-400">Последние визиты</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500">Дата / время</TableHead>
                <TableHead className="text-slate-500">Страница</TableHead>
                <TableHead className="text-slate-500">Referrer</TableHead>
                <TableHead className="text-slate-500">Устройство</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentVisits.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={4} className="text-slate-500 text-center">
                    Нет данных
                  </TableCell>
                </TableRow>
              ) : (
                recentVisits.map((v) => (
                  <TableRow key={v.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-slate-300 text-xs">
                      {new Date(v.created_at).toLocaleString("ru-RU")}
                    </TableCell>
                    <TableCell className="text-slate-300 text-xs">{v.page}</TableCell>
                    <TableCell className="text-slate-400 text-xs truncate max-w-[200px]">
                      {v.referrer || "—"}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{v.device_type || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
