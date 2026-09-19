import { cn } from "@/lib/utils";
import { osStatusLabels, osStatusColors, osPriorityLabels, osPriorityColors, type OSStatus, type OSPriority } from "@/contexts/ServiceOrderContext";

export function OSStatusBadge({ status }: { status: OSStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-300", osStatusColors[status])}>
      {osStatusLabels[status]}
    </span>
  );
}

export function OSPriorityBadge({ priority }: { priority: OSPriority }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", osPriorityColors[priority])}>
      {osPriorityLabels[priority]}
    </span>
  );
}