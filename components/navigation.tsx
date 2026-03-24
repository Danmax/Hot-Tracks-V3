"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";

const navItems = [
  {
    href: "/",
    icon: "dashboard",
    label: "Garage",
    shortLabel: "Home",
    detail: "Participant setup, tournaments, and race flow",
    roles: ["admin", "host", "official", "participant"] as UserRole[],
  },
  {
    href: "/racers",
    icon: "racers",
    label: "Drivers",
    shortLabel: "Drivers",
    detail: "Garage roster, teams, and participant records",
    roles: ["admin", "host", "official", "participant"] as UserRole[],
  },
  {
    href: "/cars",
    icon: "cars",
    label: "Cars",
    shortLabel: "Cars",
    detail: "Cars, items, and race-ready inventory",
    roles: ["admin", "host", "official", "participant"] as UserRole[],
  },
  {
    href: "/tracks",
    icon: "tracks",
    label: "Track Builder",
    shortLabel: "Tracks",
    detail: "Track builder, lane setup, and race defaults",
    roles: ["admin", "host", "official", "participant"] as UserRole[],
  },
  {
    href: "/events",
    icon: "events",
    label: "Tournaments",
    shortLabel: "Events",
    detail: "Events, championships, matches, and race control",
    roles: ["admin", "host", "official", "participant"] as UserRole[],
  },
  {
    href: "/results",
    icon: "results",
    label: "Awards",
    shortLabel: "Results",
    detail: "Awards, standings, and championship snapshots",
    roles: ["admin", "host", "official", "participant"] as UserRole[],
  },
  {
    href: "/admin",
    icon: "admin",
    label: "Team Ops",
    shortLabel: "Admin",
    detail: "Team management, sponsors, and audit control",
    roles: ["admin"] as UserRole[],
  },
];

function NavIcon({ kind }: Readonly<{ kind: string }>) {
  switch (kind) {
    case "dashboard":
      return (
        <svg aria-hidden="true" className="nav-icon-svg" viewBox="0 0 24 24">
          <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" fill="currentColor" />
        </svg>
      );
    case "racers":
      return (
        <svg aria-hidden="true" className="nav-icon-svg" viewBox="0 0 24 24">
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0Z"
            fill="currentColor"
          />
        </svg>
      );
    case "cars":
      return (
        <svg aria-hidden="true" className="nav-icon-svg" viewBox="0 0 24 24">
          <path
            d="M5 15h14l-1.5-5h-11ZM7 18.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm10 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM4 10h2l2-4h8l2 4h2v7h-1a3 3 0 0 0-6 0H10a3 3 0 0 0-6 0H3v-7Z"
            fill="currentColor"
          />
        </svg>
      );
    case "events":
      return (
        <svg aria-hidden="true" className="nav-icon-svg" viewBox="0 0 24 24">
          <path
            d="M7 3v2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V3h-2v2H9V3Zm12 7H5v8h14Z"
            fill="currentColor"
          />
        </svg>
      );
    case "tracks":
      return (
        <svg aria-hidden="true" className="nav-icon-svg" viewBox="0 0 24 24">
          <path
            d="M4 17.5 9.5 12 13 15.5 20 8.5V12h2V5h-7v2h3.5L13 12.5 9.5 9 2 16.5Z"
            fill="currentColor"
          />
        </svg>
      );
    case "results":
      return (
        <svg aria-hidden="true" className="nav-icon-svg" viewBox="0 0 24 24">
          <path
            d="M5 4h14v2H5Zm0 4h10v2H5Zm0 4h14v2H5Zm0 4h10v2H5Z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" className="nav-icon-svg" viewBox="0 0 24 24">
          <path
            d="M12 2 3 6v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V6Zm0 5a3 3 0 1 1-3 3 3 3 0 0 1 3-3Zm0 11c-2.5-.8-4.7-2.7-6-5.2a8.3 8.3 0 0 1 12 0c-1.3 2.5-3.5 4.4-6 5.2Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

export function Navigation({
  collapsed,
  userRole,
}: Readonly<{ collapsed: boolean; userRole: UserRole }>) {
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
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-icon">
              <NavIcon kind={item.icon} />
            </span>
            {!collapsed ? (
              <span className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-detail">{item.detail}</span>
              </span>
            ) : (
              <span className="nav-mobile-label">{item.shortLabel}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
