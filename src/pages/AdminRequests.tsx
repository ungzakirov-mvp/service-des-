import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare } from "lucide-react";

const AdminRequests = () => {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  if (isLoading) return <div className="text-slate-400">Загрузка...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="text-blue-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Заявки</h1>
        <span className="text-sm text-slate-500">({requests?.length || 0})</span>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500">Дата</TableHead>
                <TableHead className="text-slate-500">Имя</TableHead>
                <TableHead className="text-slate-500">Телефон</TableHead>
                <TableHead className="text-slate-500">Email</TableHead>
                <TableHead className="text-slate-500">Компания</TableHead>
                <TableHead className="text-slate-500">Сообщение</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} className="text-slate-500 text-center py-8">Заявок пока нет</TableCell>
                </TableRow>
              ) : (
                requests?.map((r) => (
                  <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-slate-300 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("ru-RU")}</TableCell>
                    <TableCell className="text-white text-sm">{r.name}</TableCell>
                    <TableCell className="text-slate-300 text-sm">{r.phone}</TableCell>
                    <TableCell className="text-slate-400 text-sm">{r.email || "—"}</TableCell>
                    <TableCell className="text-slate-400 text-sm">{r.company || "—"}</TableCell>
                    <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">{r.message || "—"}</TableCell>
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

export default AdminRequests;
