import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  User,
  ClipboardList,
  Settings,
  Key,
  ShoppingBag,
  Package,
  Cpu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useServiceOrders } from "@/contexts/ServiceOrderContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Module } from "@/lib/role";
import { NotificationDropdown } from "@/components/os/NotificationDropdown";

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
  mobileOpen: boolean;
  onMobileClose: () => void;
  onNavigateToOS?: (osId: string) => void;
}

export function AppSidebar({ mobileOpen, onMobileClose, onNavigateToOS }: AppSidebarProps) {
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
  const topMenuItems = visibleItems.filter((m) => m.path !== "/settings" && m.path !== "/passwords");
  const showSettingsIcon = canAccess("settings") || canAccess("passwords");

  // Mobile vertical sidebar content
  const mobileSidebarContent = (
    <div className="flex flex-col h-full w-60 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 min-w-0">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center animate-pulse">
              <span className="text-sidebar-primary-foreground font-bold text-sm">{company.name.charAt(0)}</span>
            </div>
          )}
          <span className="font-semibold text-sidebar-accent-foreground text-lg tracking-tight truncate">
            {company.name}
          </span>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.title}
              to={item.path}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.title}</span>
              {item.path === "/service-orders" && pendingOS > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingOS}</span>
              )}
            </NavLink>
          );
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
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{profile?.name || user?.email}</p>
            <p className="text-xs text-sidebar-foreground/75 capitalize truncate">{isAdmin ? "Admin" : role === "operational" ? "Operacional" : "Usuário"}</p>
          </div>
        </NavLink>
      </div>
    </div>
  );

  // Desktop horizontal top bar content
  const desktopHeaderContent = (
    <header className="hidden md:flex items-center h-16 w-full bg-sidebar text-sidebar-foreground px-6 border-b border-sidebar-border sticky top-0 z-40 shadow-sm shrink-0">
      {/* Left side: Brand/Company info */}
      <div className="flex items-center gap-3 shrink-0 max-w-[200px] min-w-0">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary-foreground font-bold text-sm">{company.name.charAt(0)}</span>
          </div>
        )}
        <span className="font-bold text-sidebar-accent-foreground text-sm lg:text-base xl:text-lg tracking-tight truncate max-w-[150px]">
          {company.name}
        </span>
      </div>

      {/* Center section: Horizontal Navigation Menu */}
      <div className="flex-1 flex items-center justify-center px-2 lg:px-4 min-w-0 overflow-hidden">
        <nav className="flex items-center gap-0.5 lg:gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden py-1">
          {topMenuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.title}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 lg:px-2.5 lg:py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 whitespace-nowrap",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.title}</span>
                {item.path === "/service-orders" && pendingOS > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {pendingOS}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Right side: Notifications, Settings Gear and Profile */}
      <div className="flex items-center justify-end gap-3 shrink-0 min-w-0">
        {onNavigateToOS && (
          <NotificationDropdown onNavigateToOS={onNavigateToOS} />
        )}

        {showSettingsIcon && (
          <NavLink
            to="/settings"
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg border border-sidebar-border/30 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/90 transition-all duration-200 shrink-0",
              isActive("/settings") ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-accent font-semibold" : ""
            )}
            title="Configurações"
          >
            <Settings className="w-4.5 h-4.5" />
          </NavLink>
        )}
        
        <NavLink
          to="/profile"
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-sidebar-border/30 shrink-0",
            isActive("/profile") ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-accent font-semibold" : "text-sidebar-foreground/90"
          )}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-6.5 h-6.5 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-6.5 h-6.5 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-sidebar-foreground" />
            </div>
          )}
          <div className="hidden lg:block text-left min-w-0">
            <p className="text-xs font-semibold leading-none truncate max-w-[100px] text-sidebar-accent-foreground">
              {profile?.name || user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-sidebar-foreground/70 leading-normal capitalize truncate mt-0.5">
              {isAdmin ? "Admin" : role === "operational" ? "Operacional" : "Usuário"}
            </p>
          </div>
        </NavLink>
      </div>
    </header>
  );

  return (
    <>
      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden animate-fade-in" onClick={onMobileClose} />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 shadow-xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {mobileSidebarContent}
      </div>

      {/* Desktop Horizontal Header */}
      {desktopHeaderContent}
    </>
  );
}
