"use client";

import { ClipboardList, HandHeart, History, MapPinned } from "lucide-react";
import { Shell } from "@/components/Shell";
import { CURRENT_DONOR } from "@/lib/data";

const NAV = [
  { href: "/donor", label: "Needed areas", icon: <MapPinned size={20} /> },
  { href: "/donor/donate", label: "Donate items", icon: <HandHeart size={20} /> },
  { href: "/donor/donations", label: "Donation status", icon: <ClipboardList size={20} /> },
  { href: "/donor/history", label: "History", icon: <History size={20} /> },
];

export default function DonorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell nav={NAV} user={{ name: CURRENT_DONOR.name, email: CURRENT_DONOR.email, role: "Donor portal" }}>
      {children}
    </Shell>
  );
}
