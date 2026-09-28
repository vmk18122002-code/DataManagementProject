"use client";

import Link from "next/link";
import { MapPin, Phone, Truck } from "lucide-react";
import { StatusSteps } from "@/components/StatusSteps";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { COLLECTORS, CURRENT_DONOR, ITEMS } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function DonationStatusPage() {
  const { donations } = useApp();
  const mine = donations.filter((d) => d.email === CURRENT_DONOR.email && d.status !== "Delivered");

  return (
    <>
      <PageHeader title="Donation Status" subtitle="Follow your donations from pickup to delivery." />
      <div className="space-y-4">
        {mine.map((d) => {
          const collector = COLLECTORS.find((c) => c.name === d.collector);
          return (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{d.id}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].noun}`).join(" · ")}
                  </p>
                </div>
                <p className="text-sm text-ink-muted">Submitted {d.date}</p>
              </div>
              <div className="px-5 py-6"><StatusSteps status={d.status} /></div>
              <div className="grid gap-4 border-t border-line px-5 py-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-ink-muted">Pickup from</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-ink"><MapPin size={14} />{d.address}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Delivering to</p>
                  <p className="mt-0.5 text-ink">{d.targetDs}, {d.targetDistrict}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Collector</p>
                  {collector ? (
                    <p className="mt-0.5 text-ink">
                      <span className="flex items-center gap-1.5"><Truck size={14} />{collector.name} · {collector.org}</span>
                      <span className="flex items-center gap-1.5 text-ink-soft"><Phone size={14} />{collector.phone}</span>
                    </p>
                  ) : <p className="mt-0.5 text-ink-soft">Being assigned</p>}
                </div>
              </div>
            </Card>
          );
        })}
        {!mine.length && (
          <Card>
            <EmptyState text="No donations in progress." />
            <p className="pb-8 text-center"><Link href="/donor" className="font-medium text-brand-700 hover:underline">Find an area to donate to</Link></p>
          </Card>
        )}
      </div>
    </>
  );
}
