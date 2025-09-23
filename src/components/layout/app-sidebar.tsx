import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CalendarCheck,
  BotMessageSquare,
  Settings,
  GitPullRequest,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItems = [
    { href: "/dashboard", icon: CalendarDays, label: "Dashboard" },
    { href: "/requests", icon: GitPullRequest, label: "Requests", badge: "6" },
    { href: "/conflict-detector", icon: BotMessageSquare, label: "AI Conflict Detector" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

export default function AppSidebar() {
  return (
    <div className="hidden border-r bg-background md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
            <CalendarCheck className="h-6 w-6 text-primary" />
            <span className="">Fresh Schedules</span>
          </Link>
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
                <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary"
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {item.badge && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">{item.badge}</Badge>}
                </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
