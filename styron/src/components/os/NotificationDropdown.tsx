import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useServiceOrders } from "@/contexts/ServiceOrderContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  onNavigateToOS?: (osId: string) => void;
}

export function NotificationDropdown({ onNavigateToOS }: Props) {
  const { notifications, currentUser, markNotificationRead, markAllNotificationsRead } = useServiceOrders();
  const [open, setOpen] = useState(false);

  const myNotifs = notifications.filter((n) => n.user === currentUser);
  const unreadCount = myNotifs.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <button onClick={markAllNotificationsRead} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>
          )}
        </div>
        <div className="max-h-72 overflow-auto">
          {myNotifs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma notificação</p>
          ) : (
            myNotifs.map((n) => (
              <button
                key={n.id}
                onClick={() => { markNotificationRead(n.id); onNavigateToOS?.(n.osId); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b last:border-0 hover:bg-accent/50 transition-colors",
                  !n.read && "bg-primary/5"
                )}
              >
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{format(n.date, "dd MMM, HH:mm", { locale: ptBR })}</p>
                {!n.read && <span className="inline-block w-2 h-2 bg-primary rounded-full mt-1" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}