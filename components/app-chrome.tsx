"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigation } from "@/components/navigation";
import { SignOutForm } from "@/components/sign-out-form";

const SIDEBAR_STORAGE_KEY = "hot_tracks_sidebar_collapsed";

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "HT";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AppChrome({
  children,
  userEmail,
  userName,
  userRoleLabel,
  userRole,
}: Readonly<{
  children: React.ReactNode;
  userEmail: string;
  userName: string;
  userRoleLabel: string;
  userRole: "admin" | "host" | "official" | "participant";
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const initials = useMemo(() => initialsForName(userName), [userName]);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setCollapsed(storedValue === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className={collapsed ? "app-frame sidebar-collapsed" : "app-frame"}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand-mark" aria-hidden="true">
            {collapsed ? initials : "HT"}
          </div>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar-toggle"
            onClick={() => setCollapsed((current) => !current)}
            type="button"
          >
            <span className="sidebar-toggle-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {!collapsed ? <span className="sidebar-toggle-label">Collapse</span> : null}
          </button>
        </div>

        <div className="brand-block">
          <p className="eyebrow">Race Control System</p>
          <h1>{collapsed ? "HT" : "Hot Tracks"}</h1>
          {!collapsed ? (
            <p className="brand-copy">
              Mobile-ready garage operations for participant setup, track building, event control, and championship flow.
            </p>
          ) : null}
        </div>

        <div className="mobile-user-banner">
          <div>
            <p className="eyebrow">Signed in</p>
            <p className="mobile-user-name">{userName}</p>
          </div>
          <span className="chip">{userRoleLabel}</span>
        </div>

        <Navigation collapsed={collapsed} userRole={userRole} />

        <div className="user-panel">
          <div className="user-avatar" aria-hidden="true">
            {initials}
          </div>
          {!collapsed ? (
            <>
              <p className="eyebrow">Signed in</p>
              <p className="user-name">{userName}</p>
              <p className="user-meta">
                {userRoleLabel} • {userEmail}
              </p>
            </>
          ) : null}
          <SignOutForm compact={collapsed} />
        </div>
      </aside>
      <main className="main-panel">{children}</main>
    </div>
  );
}
