import type { Shift } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ShiftCardProps {
  shift: Shift;
}

export default function ShiftCard({ shift }: ShiftCardProps) {
  const statusColors: { [key: string]: string } = {
    confirmed: "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300",
    pending: "bg-orange-100 dark:bg-orange-900/50 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300",
    conflict: "bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300",
  };

  return (
    <div
      className={cn(
        "p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        statusColors[shift.status]
      )}
    >
      <div className="font-semibold text-xs">{shift.role}</div>
      <div className="text-xs">{`${shift.startTime} - ${shift.endTime}`}</div>
      {shift.status === 'pending' && <Badge variant="secondary" className="mt-1 text-xs">Pending</Badge>}
    </div>
  );
}
