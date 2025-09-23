import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-secondary/50 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold font-headline text-foreground">
                <CalendarCheck className="h-8 w-8 text-primary" />
                Fresh Schedules
            </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
