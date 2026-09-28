"use client";

import { Gauge, LayoutDashboard, PackageSearch, Route, Shuffle, Users } from "lucide-react";
import { Shell } from "@/components/Shell";

const NAV = [
  { href: "/coordinator", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/coordinator/donations", label: "Donor data", icon: <PackageSearch size={20} /> },
  { href: "/coordinator/limits", label: "Limits", icon: <Gauge size={20} /> },
  { href: "/coordinator/allocation", label: "Resource allocation", icon: <Shuffle size={20} /> },
  { href: "/coordinator/deliveries", label: "Delivery status", icon: <Route size={20} /> },
  { href: "/coordinator/collectors", label: "Collectors", icon: <Users size={20} /> },
];

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell nav={NAV} user={{ name: "District Coordinator", email: "coordinator@reliefhub.lk", role: "Coordinator portal" }}>
      {children}
    </Shell>
  );
}
