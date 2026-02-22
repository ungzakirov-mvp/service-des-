import { useEffect } from "react";
import { useNavigate, NavLink, Outlet } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { BarChart3, Settings, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminLayout = () => {
  const { user, isAdmin, loading, logout } = useAdmin();
  const navigate = useNavigate();

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

  const navItems = [
    { to: "/admin/dashboard", icon: BarChart3, label: "Дашборд" },
    { to: "/admin/pricing", icon: Settings, label: "Тарифы и услуги" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Novum Tech</h2>
          <p className="text-xs text-slate-500">Админ-панель</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
