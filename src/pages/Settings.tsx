import { NavLink, Outlet } from "react-router-dom";
import { Building2, KeyRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/settings/company", label: "Empresa", icon: Building2 },
  { path: "/settings/password", label: "Senha", icon: KeyRound },
  { path: "/settings/accounts", label: "Contas", icon: Users },
];

export default function Settings() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {tabs.map((t) => (
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
