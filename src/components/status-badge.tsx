import { STATUS_LABEL } from "@/lib/status";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide",
        `status-${status}`,
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
