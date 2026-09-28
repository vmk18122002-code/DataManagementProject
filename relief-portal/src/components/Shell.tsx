"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, LogOut, Menu, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { Logo, cx } from "./ui";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function Shell({ nav, user, children }: {
  nav: NavItem[];
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const path = usePathname();
  const { mode } = useApp();
  const [open, setOpen] = useState(false);
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const disaster = mode === "disaster";

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="px-7 pb-6 pt-7"><Logo /></div>
      <p className="px-7 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{user.role}</p>
      <ul className="flex-1 space-y-1 px-3.5">
        {nav.map((n) => {
          const active = path === n.href;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                className={cx("flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] transition-colors",
                  active ? "bg-brand-600 font-medium text-white" : "text-ink hover:bg-brand-50 hover:text-brand-700")}
              >
                {n.icon}
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-line px-3.5 py-4">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-ink hover:bg-gray-50">
          <LogOut size={20} /> Sign out
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 border-r border-line bg-white lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-xl">
            <button className="absolute right-3 top-3 rounded p-1.5 text-ink-muted hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-ink hover:bg-gray-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
              disaster ? "bg-danger-600 text-white" : "bg-brand-50 text-brand-700")}>
              <span className={cx("h-2 w-2 rounded-full", disaster ? "animate-pulse bg-white" : "bg-brand-500")} />
              {disaster ? "Disaster Mode" : "Normal Mode"}
            </span>
          </div>
          <div className="flex items-center gap-3 border-l border-line pl-4 sm:pl-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-sm font-medium text-white">{initials}</span>
            <div className="hidden leading-tight sm:block">
              <p className="text-ink">{user.name}</p>
              <p className="text-sm text-ink-muted">{user.email}</p>
            </div>
          </div>
        </header>

        {disaster && (
          <div className="flex items-center gap-2 bg-danger-600 px-4 py-2.5 text-sm text-white sm:px-8">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              <b>Disaster Mode is active.</b> Affected DS divisions are prioritised and their limits are raised.
            </span>
          </div>
        )}

        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12">{children}</main>
      </div>
    </div>
  );
}
