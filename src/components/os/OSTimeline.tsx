import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import type { OSTimelineEntry } from "@/contexts/ServiceOrderContext";

export function OSTimeline({ entries }: { entries: OSTimelineEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
  return (
    <div className="space-y-4">
      {sorted.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            {i < sorted.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium">{entry.action || "Ação realizada"}</p>
            <p className="text-xs text-muted-foreground">
              {entry.user} · {format(entry.date, "dd MMM yyyy, HH:mm", { locale: ptBR })}
            </p>
            {entry.details && <p className="text-xs text-muted-foreground mt-1">{entry.details}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}