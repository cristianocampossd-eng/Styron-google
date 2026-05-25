import { useState, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "@/components/os/NotificationDropdown";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigateToOS = useCallback((_osId: string) => {
    navigate("/service-orders");
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between h-14 px-4 border-b bg-card">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <span className="ml-2 font-semibold">STYRON</span>
          </div>
          <NotificationDropdown onNavigateToOS={handleNavigateToOS} />
        </div>
        {/* Desktop notification bar */}
        <div className="hidden md:flex items-center justify-end h-12 px-6 border-b bg-card">
          <NotificationDropdown onNavigateToOS={handleNavigateToOS} />
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}