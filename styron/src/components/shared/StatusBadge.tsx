import { cn } from "@/lib/utils";
import { statusColors, statusLabels, type ProjectStatus } from "@/data/mock";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusColors[status])}>
      {statusLabels[status]}
    </span>
  );
}