import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-card rounded-xl border p-5 animate-slide-up">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}