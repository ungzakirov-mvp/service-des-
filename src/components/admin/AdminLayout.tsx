import { useEffect } from "react";
import { useNavigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { LayoutDashboard, CreditCard, Headphones, MessageSquare, LogOut, Home, FolderOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Обзор", exact: true },
  { to: "/admin/pricing", icon: CreditCard, label: "Тарифы" },
  { to: "/admin/categories", icon: FolderOpen, label: "Категории" },
  { to: "/admin/services", icon: Headphones, label: "Услуги" },
  { to: "/admin/requests", icon: MessageSquare, label: "Заявки" },
  { to: "/admin/reviews", icon: Star, label: "Отзывы" },
];

const AdminLayout = () => {
  const { user, isAdmin, loading, logout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin");
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Novum Tech</h2>
          <p className="text-xs text-slate-500">Админ-панель</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Home size={18} />
            Открыть сайт
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-red-400"
            onClick={async () => {
              await logout();
              navigate("/admin");
            }}
          >
            <LogOut size={18} className="mr-3" />
            Выйти
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 h-14 flex items-center justify-between">
        <span className="text-white font-bold">Novum Tech</span>
        <Button variant="ghost" size="sm" className="text-slate-400" onClick={async () => { await logout(); navigate("/admin"); }}>
          <LogOut size={16} />
        </Button>
      </div>

      {/* Mobile nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur border-t border-slate-800 flex justify-around py-2">
        {navItems.map(({ to, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <NavLink key={to} to={to} className={`flex flex-col items-center gap-1 px-2 py-1 text-xs ${active ? "text-blue-400" : "text-slate-500"}`}>
              <Icon size={18} />
            </NavLink>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 pb-16 lg:pb-0">
        <div className="p-6 lg:p-8 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
