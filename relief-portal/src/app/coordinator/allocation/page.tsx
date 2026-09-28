"use client";

import { CheckCircle2, MapPin } from "lucide-react";
import { useState } from "react";
import { Button, Card, EmptyState, LevelBadge, PageHeader, StatusBadge } from "@/components/ui";
import { ITEMS } from "@/lib/data";
import { fmt, suggestAllocation } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function Allocation() {
  const { donations, updateDonation, mode, adjustments, confirmedAreas } = useApp();
  const pending = donations.filter((d) => d.status === "Submitted" || d.status === "Allocated");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState<Set<string>>(new Set());

  return (
    <>
      <PageHeader title="Resource Allocation"
        subtitle="Each donation is matched to the closest priority areas that still have limit left. When an area's limit is used up, the rest moves to the next area." />

      <div className="space-y-4">
        {pending.map((d) => {
          const main = d.items[0];
          const sugg = suggestAllocation(main.item, main.qty, d.district, mode, adjustments, confirmedAreas, 3);
          const choice = picked[d.id] ?? `${d.targetDs}|${d.targetDistrict}`;
          return (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <div className="flex items-center gap-2"><p className="font-semibold text-ink">{d.id}</p><StatusBadge status={d.status} /></div>
                  <p className="mt-1 text-sm text-ink-soft">{d.donor} · {d.district} · {d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].noun}`).join(", ")}</p>
                </div>
                <p className="text-sm text-ink-muted">Current: <span className="text-ink">{d.targetDs}, {d.targetDistrict}</span></p>
              </div>
              <div className="p-5">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-brand-700"><MapPin size={16} /> Suggested areas for {ITEMS[main.item].noun}</p>
                <div className="grid gap-2 lg:grid-cols-3">
                  {sugg.map((s) => {
                    const key = `${s.row.area.ds}|${s.row.area.district}`;
                    return (
                      <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                        <input type="radio" name={d.id} className="mt-1 accent-brand-600" checked={choice === key} onChange={() => setPicked({ ...picked, [d.id]: key })} />
                        <span className="flex-1">
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-ink">{s.row.area.ds}</span>
                            <LevelBadge level={s.row.affected?.priority ?? s.row.level} />
                          </span>
                          <span className="block text-ink-muted">{s.row.area.district} · {s.km} km</span>
                          <span className="mt-1 block tabular-nums text-ink-soft">{fmt(s.qty)} {ITEMS[main.item].unit} of {fmt(s.row.remaining)} left</span>
                          <span className="mt-1 block text-xs text-ink-muted">{s.reason}</span>
                        </span>
                      </label>
                    );
                  })}
                  {!sugg.length && <p className="text-sm text-ink-muted">No area has limit left for this item.</p>}
                </div>
                <div className="mt-4 flex items-center justify-end gap-3">
                  {approved.has(d.id) && <span className="flex items-center gap-1.5 text-sm text-brand-700"><CheckCircle2 size={16} />Allocation saved</span>}
                  <Button size="sm" onClick={() => {
                    const [ds, district] = choice.split("|");
                    updateDonation(d.id, { targetDs: ds, targetDistrict: district, status: "Allocated" });
                    setApproved(new Set(approved).add(d.id));
                  }}>
                    <CheckCircle2 size={16} /> Approve allocation
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {!pending.length && <Card><EmptyState text="Every donation is allocated." /></Card>}
      </div>
    </>
  );
}
