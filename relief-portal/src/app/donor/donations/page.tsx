"use client";

import Link from "next/link";
import { CheckCircle2, FileCheck2, MapPin, Phone, Truck, Warehouse } from "lucide-react";
import { StatusSteps } from "@/components/StatusSteps";
import { Badge, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { COLLECTORS, CURRENT_DONOR, ITEMS } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function DonationStatusPage() {
  const { donations } = useApp();
  const mine = donations.filter((d) => d.email === CURRENT_DONOR.email);

  return (
    <>
      <PageHeader
        title="Donation Status"
        subtitle="Follow your donations from pickup to reaching the target area."
      />
      <div className="space-y-4">
        {mine.map((d) => {
          const collector = COLLECTORS.find((c) => c.name === d.collector);
          return (
            <Card key={d.id}>
              {/* header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{d.id}</p>
                    <StatusBadge status={d.status} />
                    {d.areaProof && <Badge tone="green"><CheckCircle2 size={11} /> Reached area</Badge>}
                    {!d.areaProof && d.proof && <Badge tone="green"><FileCheck2 size={11} /> Store proof</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].noun}`).join(" · ")}
                  </p>
                </div>
                <p className="text-sm text-ink-muted">Submitted {d.date}</p>
              </div>

              {/* progress steps */}
              <div className="px-5 py-6"><StatusSteps status={d.status} /></div>

              {/* detail grid */}
              <div className="grid gap-4 border-t border-line px-5 py-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-ink-muted">Pickup from</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-ink"><MapPin size={14} />{d.address}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Going to</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-ink">
                    <Warehouse size={14} className="text-brand-600" />
                    {d.areaProof
                      ? `${d.targetDs}, ${d.targetDistrict}`
                      : d.proof
                        ? `${d.proof.org} Store Room`
                        : `${d.targetDs}, ${d.targetDistrict}`}
                  </p>
                </div>
                <div>
                  <p className="text-ink-muted">Collector</p>
                  {collector ? (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="flex items-center gap-1.5 text-ink"><Truck size={14} />{collector.name} · {collector.org}</p>
                      <p className="flex items-center gap-1.5 text-ink-soft"><Phone size={14} />{collector.phone}</p>
                    </div>
                  ) : <p className="mt-0.5 text-ink-soft">Being assigned</p>}
                </div>
              </div>

              {/* store proof panel */}
              {d.proof && !d.areaProof && (
                <div className="border-t border-emerald-200 bg-emerald-50/60 px-5 py-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <FileCheck2 size={16} /> Items received at organisation store room
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <img src={d.proof.photoUrl} alt="Store proof" className="h-24 w-24 rounded-xl border border-emerald-200 object-cover shadow-sm" />
                    <div className="flex-1 space-y-1 text-sm">
                      <p className="font-medium text-emerald-800">Store voucher:</p>
                      <p className="italic text-emerald-700">{d.proof.note}</p>
                      <p className="text-xs text-emerald-600 pt-1">By {d.proof.org} · {new Date(d.proof.time).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* FINAL: area reached confirmation */}
              {d.areaProof && (
                <div className="border-t-2 border-brand-400 bg-gradient-to-br from-brand-50 to-white px-5 py-5">
                  <p className="mb-2 flex items-center gap-2 text-base font-bold text-brand-800">
                    <CheckCircle2 size={20} className="text-brand-600" />
                    Your items have reached {d.targetDs}!
                  </p>
                  <p className="mb-4 text-sm text-brand-700">
                    Your donation has arrived at <strong>{d.targetDs}</strong>, {d.targetDistrict} and is ready for distribution to those in need.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <img src={d.areaProof.photoUrl} alt="Area reached proof" className="h-32 w-32 rounded-xl border-2 border-brand-300 object-cover shadow-md" />
                    <div className="flex-1 space-y-1.5 text-sm">
                      <p className="font-semibold text-brand-800">Field confirmation:</p>
                      <p className="italic text-brand-700">{d.areaProof.note}</p>
                      <p className="text-xs text-brand-600 pt-1">
                        Confirmed by {d.areaProof.by} · {new Date(d.areaProof.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {d.proof && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 border border-brand-100">
                      <img src={d.proof.photoUrl} alt="store proof" className="h-8 w-8 rounded object-cover" />
                      <p className="text-xs text-brand-600">Store receipt: {d.proof.note}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {!mine.length && (
          <Card>
            <EmptyState text="No donations yet." />
            <p className="pb-8 text-center">
              <Link href="/donor/donate" className="font-medium text-brand-700 hover:underline">
                Make your first donation
              </Link>
            </p>
          </Card>
        )}
      </div>
    </>
  );
}