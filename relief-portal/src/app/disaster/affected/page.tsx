"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, MapPinned, Users } from "lucide-react";
import { ModeCard } from "@/components/ModeCard";
import { Badge, Button, Card, LevelBadge, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { AFFECTED, disasterExtra } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

const key = (a: { district: string; ds: string }) => `${a.district}|${a.ds}`;
const ORDER = { Critical: 0, High: 1, Medium: 2 };

export default function Affected() {
  const { mode, confirmedAreas, setConfirmedAreas } = useApp();
  const [sel, setSel] = useState<Set<string>>(() => new Set(confirmedAreas.size ? confirmedAreas : AFFECTED.map(key)));
  const [saved, setSaved] = useState(false);
  const rows = [...AFFECTED].sort((a, b) => ORDER[a.priority] - ORDER[b.priority] || b.predicted - a.predicted);
  const people = rows.filter((r) => sel.has(key(r))).reduce((s, r) => s + r.predicted, 0);

  if (mode !== "disaster") {
    return (
      <>
        <PageHeader title="Affected Areas" />
        <ModeCard />
        <Card><p className="px-5 py-10 text-center text-ink-muted">No active disaster. <Link href="/disaster" className="font-medium text-brand-700 hover:underline">Check alerts</Link>, use manual activation, or switch to Disaster mode above.</p></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Affected Areas"
        subtitle="DS divisions from the confirmed alert. The XGBoost model predicts people affected; areas hit again within 90 days move up to Critical." />
      <ModeCard />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Areas confirmed" value={`${sel.size} / ${rows.length}`} icon={<MapPinned size={18} />} tone="red" />
        <StatCard label="Predicted people affected" value={fmt(people)} icon={<Users size={18} />} tone="red" hint="XGBoost count model" />
        <StatCard label="Critical areas" value={rows.filter((r) => r.priority === "Critical" && sel.has(key(r))).length} icon={<AlertTriangle size={18} />} tone="red" hint="Already affected in last 90 days" />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th><span className="sr-only">Confirm</span></Th><Th>DS division</Th><Th>Hazard</Th><Th>Priority</Th>
              <Th className="text-right">Predicted affected</Th><Th className="text-right">+ Food packs</Th><Th className="text-right">+ Clothes</Th><Th className="text-right">+ Books</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const k = key(a);
              return (
                <tr key={k} className="hover:bg-gray-50/60">
                  <Td>
                    <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={sel.has(k)} aria-label={`Confirm ${a.ds}`}
                      onChange={() => { const s = new Set(sel); if (s.has(k)) s.delete(k); else s.add(k); setSel(s); setSaved(false); }} />
                  </Td>
                  <Td><p className="font-medium text-ink">{a.ds}</p><p className="text-xs text-ink-muted">{a.district} · started {a.start}</p></Td>
                  <Td><Badge tone="blue">{a.hazard}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <LevelBadge level={a.priority} />
                      {a.alreadyAffected && <Badge tone="red">Hit again</Badge>}
                    </div>
                  </Td>
                  <Td className="text-right font-medium tabular-nums text-ink">{fmt(a.predicted)}</Td>
                  <Td className="text-right tabular-nums">+{fmt(disasterExtra(a, "food"))}</Td>
                  <Td className="text-right tabular-nums">+{fmt(disasterExtra(a, "clothes"))}</Td>
                  <Td className="text-right tabular-nums">+{fmt(disasterExtra(a, "books"))}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-sm text-ink-soft">Uncheck areas that the field team says are not affected. Only confirmed areas get raised limits.</p>
          <div className="flex items-center gap-3">
            {saved && <span className="flex items-center gap-1.5 text-sm text-brand-700"><CheckCircle2 size={16} />Saved</span>}
            <Button onClick={() => {
              setConfirmedAreas(new Set(sel));
              setSaved(true);
            }}>Confirm areas</Button>
          </div>
        </div>
      </Card>
    </>
  );
}
