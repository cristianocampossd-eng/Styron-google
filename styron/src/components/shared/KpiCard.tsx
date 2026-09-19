import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  valueClassName?: string;
}

export function KpiCard({ title, value, change, icon: Icon, iconColor, valueClassName }: KpiCardProps) {
  return (
    <div className="bg-card rounded-xl border p-5 hover:shadow-md transition-shadow duration-200 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-semibold tracking-tight", valueClassName)}>{value}</p>
        </div>
        <div className={cn("p-2.5 rounded-lg", iconColor || "bg-accent")}>
          <Icon className="w-5 h-5 text-accent-foreground" />
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          {change >= 0 ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
          <span className={change >= 0 ? "text-success" : "text-destructive"}>
            {change >= 0 ? "+" : ""}{change}%
          </span>
          <span className="text-muted-foreground ml-1">vs período anterior</span>
        </div>
      )}
    </div>
  );
}