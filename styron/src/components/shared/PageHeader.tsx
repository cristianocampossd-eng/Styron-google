import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function PageHeader({ title, description, actions, filters }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {filters}
        {actions}
      </div>
    </div>
  );
}