"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { ItemTabs } from "@/components/ItemTabs";
import { Badge, Card, EmptyState, Input, LevelBadge, Meter, PageHeader, Select, Table, Td, Th } from "@/components/ui";
import { CURRENT_DONOR, DISTRICTS, ITEMS, ItemKey, distanceKm } from "@/lib/data";
import { fmt, needRows, suggestAllocation } from "@/lib/needs";
import { useApp } from "@/lib/store";

const PAGE = 20;

export default function NeededAreas() {
  const { mode, adjustments, confirmedAreas } = useApp();
  const [item, setItem] = useState<ItemKey>("food");
  const [district, setDistrict] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"priority" | "distance">("priority");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    let r = needRows(item, mode, adjustments, confirmedAreas).filter((x) => x.remaining > 0);
    if (district) r = r.filter((x) => x.area.district === district);
    if (q) r = r.filter((x) => `${x.area.ds} ${x.area.district}`.toLowerCase().includes(q.toLowerCase()));
    if (sort === "distance") {
      r = [...r].sort((a, b) => distanceKm(CURRENT_DONOR.district, a.area.district) - distanceKm(CURRENT_DONOR.district, b.area.district) || b.score - a.score);
    }
    return r;
  }, [item, mode, adjustments, confirmedAreas, district, q, sort]);

  // "closest 3 areas": ask for an unlimited quantity so 3 areas are listed instead of filling just one
  const picks = useMemo(
    () => suggestAllocation(item, Number.MAX_SAFE_INTEGER, CURRENT_DONOR.district, mode, adjustments, confirmedAreas, 3),
    [item, mode, adjustments, confirmedAreas],
  );
  const unit = ITEMS[item].unit;

  return (
    <>
      <PageHeader title="Needed Areas" subtitle="Areas that still need items, ordered by priority. Pick an area and donate." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <ItemTabs value={item} onChange={(k) => { setItem(k); setShown(PAGE); }} />
      </div>

      <Card className="mb-6 border-brand-200 bg-brand-50/40">
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2 text-brand-700">
            <MapPin size={18} />
            <p className="font-medium">Closest priority areas to you ({CURRENT_DONOR.district})</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {picks.map((p) => (
              <div key={p.row.area.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{p.row.area.ds}</p>
                    <p className="text-sm text-ink-muted">{p.row.area.district} · {p.km} km</p>
                  </div>
                  <LevelBadge level={p.row.affected?.priority ?? p.row.level} />
                </div>
                <p className="mt-3 text-sm text-ink-soft">
                  Needs <b className="tabular-nums text-ink">{fmt(p.row.remaining)}</b> {unit}
                </p>
                <Link href={`/donor/donate?item=${item}&ds=${encodeURIComponent(p.row.area.ds)}&district=${encodeURIComponent(p.row.area.district)}`}
                  className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:underline">Donate here →</Link>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input placeholder="Search DS division or district" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">All districts</option>
          {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as "priority" | "distance")} className="w-auto">
          <option value="priority">Sort: priority</option>
          <option value="distance">Sort: closest to me</option>
        </Select>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Area (DS division)</Th>
              <Th>Drop-off address</Th>
              <Th>Priority</Th>
              <Th className="text-right">Still needed</Th>
              <Th>Limit used</Th>
              <Th className="text-right">Distance</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((r) => (
              <tr key={r.area.id} className="hover:bg-gray-50/60">
                <Td>
                  <p className="font-medium text-ink">{r.area.ds}</p>
                  <p className="text-xs text-ink-muted">{r.area.district} district</p>
                </Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-ink-muted" />Divisional Secretariat, {r.area.ds}</span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <LevelBadge level={r.affected?.priority ?? r.level} />
                    {r.affected && <Badge tone="red">{r.affected.hazard}</Badge>}
                  </div>
                </Td>
                <Td className="text-right font-medium tabular-nums text-ink">{fmt(r.remaining)} <span className="font-normal text-ink-muted">{unit}</span></Td>
                <Td><Meter pct={r.pct} /></Td>
                <Td className="text-right tabular-nums">{distanceKm(CURRENT_DONOR.district, r.area.district)} km</Td>
                <Td className="text-right">
                  <Link href={`/donor/donate?item=${item}&ds=${encodeURIComponent(r.area.ds)}&district=${encodeURIComponent(r.area.district)}`}
                    className="inline-flex rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                    Donate
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!rows.length && <EmptyState text="No areas match your filters." />}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-soft">
          <span>Showing {Math.min(shown, rows.length)} of {rows.length} areas</span>
          {shown < rows.length && (
            <button onClick={() => setShown(shown + PAGE)} className="font-medium text-brand-700 hover:underline">Show more</button>
          )}
        </div>
      </Card>
    </>
  );
}
