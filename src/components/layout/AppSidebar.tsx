import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  User,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Settings,
  Key,
  ShoppingBag,
  Package,
  Cpu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useServiceOrders } from "@/contexts/ServiceOrderContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Module } from "@/lib/role";

const menuItems: { title: string; path: string; icon: any; module: Module }[] = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard, module: "dashboard" },
  { title: "Projetos", path: "/projects", icon: FolderKanban, module: "projects" },
  { title: "Ordem de Serviço", path: "/service-orders", icon: ClipboardList, module: "service_orders" },
  { title: "Financeiro", path: "/financial", icon: Wallet, module: "financial" },
  { title: "Vendas", path: "/sales", icon: ShoppingBag, module: "sales" },
  { title: "Produtos", path: "/products", icon: Package, module: "products" },
  { title: "Sistemas", path: "/systems", icon: Cpu, module: "systems" },
  { title: "Senhas da Empresa", path: "/passwords", icon: Key, module: "passwords" },
  { title: "Configurações", path: "/settings", icon: Settings, module: "settings" },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const { pathname } = useLocation();
  const { orders } = useServiceOrders();
  const { profile, isAdmin, user, canAccess, role } = useAuth();
  const currentUserId = user?.id || "";
  const pendingOS = orders.filter((o) => (o.responsible === currentUserId || o.creator === currentUserId) && !["completed", "archived"].includes(o.status)).length;

  const [company, setCompany] = useState<{ name: string; logo_url: string | null }>({ name: "STYRON", logo_url: null });
  useEffect(() => {
    supabase.from("company_settings").select("name, logo_url").maybeSingle().then(({ data }) => {
      if (data) setCompany({ name: data.name || "STYRON", logo_url: data.logo_url || null });
    }).catch((err) => {
      console.error("Erro ao carregar configurações da empresa do Supabase:", err);
    });
    const ch = supabase.channel("company-settings-rt").on("postgres_changes", { event: "*", schema: "public", table: "company_settings" }, (payload: any) => {
      if (payload.new) setCompany({ name: payload.new.name || "STYRON", logo_url: payload.new.logo_url || null });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const isActive = (path: string) => path === "/" ? pathname === "/" : pathname.startsWith(path);
  const visibleItems = menuItems.filter((m) => canAccess(m.module));

  const sidebarContent = (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300", collapsed ? "w-16" : "w-60")}>
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 min-w-0">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">{company.name.charAt(0)}</span>
            </div>
          )}
          {!collapsed && (
            <span className="font-semibold text-sidebar-accent-foreground text-lg tracking-tight animate-fade-in truncate">
              {company.name}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {visibleItems.map((item) => {
          const active = isActive(item.path);
          const link = (
            <NavLink
              key={item.title}
              to={item.path}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="animate-fade-in flex-1">{item.title}</span>}
              {!collapsed && item.path === "/service-orders" && pendingOS > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingOS}</span>
              )}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.title} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">{item.title}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <NavLink
          to="/profile"
          onClick={onMobileClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            isActive("/profile")
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
          )}
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{profile?.name || user?.email}</p>
              <p className="text-xs text-sidebar-foreground capitalize">{isAdmin ? "Admin" : role === "operational" ? "Operacional" : "Usuário"}</p>
            </div>
          )}
        </NavLink>
      </div>

      <button
        onClick={onToggle}
        className="hidden md:flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={onMobileClose} />}
      <div className={cn("fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        {sidebarContent}
      </div>
      <div className="hidden md:block shrink-0">{sidebarContent}</div>
    </>
  );
}
