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

const navItems = [
    { href: "/dashboard", icon: CalendarDays, label: "Dashboard" },
    { href: "/requests", icon: GitPullRequest, label: "Requests", badge: "6" },
    { href: "/conflict-detector", icon: BotMessageSquare, label: "AI Conflict Detector" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

export default function MobileNav() {
    return (
        <nav className="grid gap-2 text-lg font-medium">
            <Link
              href="#"
              className="flex items-center gap-2 text-lg font-semibold font-headline mb-4"
            >
              <CalendarCheck className="h-6 w-6 text-primary" />
              <span>Fresh Schedules</span>
            </Link>
            {navItems.map((item) => (
                <Link
                    key={item.label}
                    href={item.href}
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {item.badge && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">{item.badge}</Badge>}
                </Link>
            ))}
        </nav>
    )
}
