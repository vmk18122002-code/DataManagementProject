"use client";

import { BellRing, Hand, MapPinned } from "lucide-react";
import { Shell } from "@/components/Shell";

const NAV = [
  { href: "/disaster", label: "Alerts", icon: <BellRing size={20} /> },
  { href: "/disaster/affected", label: "Affected areas", icon: <MapPinned size={20} /> },
  { href: "/disaster/manual", label: "Manual activation", icon: <Hand size={20} /> },
];

export default function DisasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell nav={NAV} user={{ name: "Disaster Desk Officer", email: "dmc-desk@reliefhub.lk", role: "Disaster portal" }}>
      {children}
    </Shell>
  );
}
