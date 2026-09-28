"use client";

import { History, MessageSquareWarning, PackageOpen, Truck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { CURRENT_COLLECTOR } from "@/lib/data";

const NAV = [
  { href: "/collector", label: "Pickups", icon: <PackageOpen size={20} /> },
  { href: "/collector/deliveries", label: "Deliveries", icon: <Truck size={20} /> },
  { href: "/collector/feedback", label: "Field report", icon: <MessageSquareWarning size={20} /> },
  { href: "/collector/history", label: "History", icon: <History size={20} /> },
];

export default function CollectorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell nav={NAV} user={{ name: CURRENT_COLLECTOR.name, email: CURRENT_COLLECTOR.org, role: "Collector portal" }}>
      {children}
    </Shell>
  );
}
