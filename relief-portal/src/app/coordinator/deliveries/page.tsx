"use client";

import { MapPin, Truck } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";
import { ITEMS, STATUS_FLOW } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function Deliveries() {
  const { donations } = useApp();
  return (
    <>
      <PageHeader title="Delivery Status" subtitle="Where every donation is right now." />
      <div className="scroll-thin flex gap-4 overflow-x-auto pb-4">
        {STATUS_FLOW.map((s) => {
          const list = donations.filter((d) => d.status === s);
          return (
            <div key={s} className="w-72 shrink-0 rounded-xl bg-gray-100/80 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="font-medium text-ink">{s}</p>
                <Badge>{list.length}</Badge>
              </div>
              <div className="space-y-3">
                {list.map((d) => (
                  <div key={d.id} className="rounded-lg border border-line bg-white p-3.5 text-sm">
                    <p className="font-medium text-ink">{d.id} · {d.donor}</p>
                    <p className="mt-1 tabular-nums text-ink-soft">{d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].unit}`).join(", ")}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-ink-muted"><MapPin size={14} />{d.district} → {d.targetDs}</p>
                    {d.collector && <p className="mt-1 flex items-center gap-1.5 text-ink-muted"><Truck size={14} />{d.collector}</p>}
                  </div>
                ))}
                {!list.length && <p className="px-1 py-4 text-center text-sm text-ink-muted">Nothing here</p>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
