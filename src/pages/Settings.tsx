import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, KeyRound, Users, Key, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Settings() {
  const { canAccess } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: "/settings/company", label: "Empresa", icon: Building2, module: "settings" as const },
    { path: "/settings/accounts", label: "Usuários", icon: Users, module: "settings" as const },
    { path: "/settings/integrations", label: "Integrações", icon: Calendar, module: "settings" as const },
    { path: "/settings/password", label: "Minha Senha", icon: KeyRound, module: "profile" as const },
    { path: "/settings/passwords", label: "Senhas da Empresa", icon: Key, module: "passwords" as const },
  ];

  const allowedTabs = tabs.filter((t) => canAccess(t.module));

  useEffect(() => {
    if (pathname === "/settings" || pathname === "/settings/") {
      if (allowedTabs.length > 0) {
        navigate(allowedTabs[0].path, { replace: true });
      }
    }
  }, [pathname, allowedTabs, navigate]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit flex-wrap">
        {allowedTabs.map((t) => (
          <NavLink
            key={t.path}
            to={t.path}
            className={({ isActive }) =>
              cn(
                "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
                isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
