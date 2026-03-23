"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";

const navItems = [
  { href: "/", label: "Dashboard", roles: ["admin", "host", "official", "participant"] as UserRole[] },
  { href: "/racers", label: "Racers", roles: ["admin", "host", "official", "participant"] as UserRole[] },
  { href: "/cars", label: "Cars", roles: ["admin", "host", "official", "participant"] as UserRole[] },
  { href: "/events", label: "Events", roles: ["admin", "host", "official", "participant"] as UserRole[] },
  { href: "/results", label: "Results", roles: ["admin", "host", "official", "participant"] as UserRole[] },
  { href: "/admin", label: "Admin", roles: ["admin"] as UserRole[] },
];

export function Navigation({ userRole }: Readonly<{ userRole: UserRole }>) {
  const pathname = usePathname();

  return (
    <nav className="nav-list" aria-label="Primary">
      {navItems.filter((item) => item.roles.includes(userRole)).map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            className={isActive ? "nav-link active" : "nav-link"}
            href={item.href}
            key={item.href}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
