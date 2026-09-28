"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertOctagon, Clock, PackageCheck, Truck } from "lucide-react";
import { ItemTabs } from "@/components/ItemTabs";
import { Badge, Card, LevelBadge, Meter, PageHeader, StatCard, StatusBadge, Table, Td, Th } from "@/components/ui";
import { DISTRICTS, ITEMS, ItemKey } from "@/lib/data";
import { fmt, needRows } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function CoordinatorDashboard() {
  const { donations, mode, adjustments, confirmedAreas, feedback } = useApp();
  const [item, setItem] = useState<ItemKey>("food");
  const rows = useMemo(() => needRows(item, mode, adjustments, confirmedAreas), [item, mode, adjustments, confirmedAreas]);

  const byDistrict = useMemo(() => DISTRICTS.map((d) => {
    const r = rows.filter((x) => x.area.district === d);
    const limit = r.reduce((s, x) => s + x.limit, 0);
    const used = r.reduce((s, x) => s + x.used, 0);
    return { d, limit, used, pct: limit ? Math.round((used / limit) * 100) : 0, full: r.filter((x) => x.pct >= 100).length };
  }).sort((a, b) => b.pct - a.pct), [rows]);

  const count = (s: string) => donations.filter((d) => d.status === s).length;
  const atLimit = rows.filter((r) => r.pct >= 100).length;

  return (
    <>
      <PageHeader title="Coordinator Dashboard" subtitle="Donations, limits and priority areas across all districts." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Waiting for allocation" value={count("Submitted")} icon={<Clock size={18} />} hint="New donations" />
        <StatCard label="In progress" value={count("Allocated") + count("Collector assigned") + count("Picked up")} icon={<Truck size={18} />} hint="Allocated, assigned or picked up" />
        <StatCard label="Delivered" value={count("Delivered")} icon={<PackageCheck size={18} />} />
        <StatCard label={`DS divisions at ${ITEMS[item].label.toLowerCase()} limit`} value={atLimit} icon={<AlertOctagon size={18} />}
          tone="red" hint={feedback.length ? `${feedback.length} field report(s) waiting` : "Overflow moves to the next priority area"} />
      </div>

      <div className="mb-4"><ItemTabs value={item} onChange={setItem} /></div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Top priority areas" action={<Link href="/coordinator/limits" className="text-sm font-medium text-brand-700 hover:underline">All limits</Link>}>
          <Table>
            <thead><tr><Th>DS division</Th><Th>Priority</Th><Th className="text-right">Remaining</Th><Th>Limit used</Th></tr></thead>
            <tbody>
              {rows.slice(0, 8).map((r) => (
                <tr key={r.area.id}>
                  <Td><p className="font-medium text-ink">{r.area.ds}</p><p className="text-xs text-ink-muted">{r.area.district}</p></Td>
                  <Td><div className="flex gap-1"><LevelBadge level={r.affected?.priority ?? r.level} />{r.affected && <Badge tone="red">{r.affected.hazard}</Badge>}</div></Td>
                  <Td className="text-right tabular-nums text-ink">{fmt(r.remaining)}</Td>
                  <Td><Meter pct={r.pct} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card title="Recent donations" action={<Link href="/coordinator/donations" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>}>
          <ul className="divide-y divide-line">
            {donations.slice(0, 6).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <div className="min-w-0">
                  <p className="text-ink"><span className="font-medium">{d.id}</span> · {d.donor}</p>
                  <p className="truncate text-ink-muted">{d.district} → {d.targetDs}, {d.targetDistrict}</p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title={`Limit usage by district - ${ITEMS[item].label}`} className="mt-6">
        <div className="grid gap-x-10 gap-y-3 p-5 md:grid-cols-2">
          {byDistrict.map((x) => (
            <div key={x.d} className="grid grid-cols-[120px_1fr] items-center gap-3 text-sm">
              <span className="truncate text-ink">{x.d}</span>
              <Meter pct={x.pct} />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
