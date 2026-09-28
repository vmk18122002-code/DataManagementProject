"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { ItemTabs } from "@/components/ItemTabs";
import {
  Badge, Button, Card, EmptyState, Field, Input, LevelBadge, Meter, Modal, PageHeader, Select, Table, Td, Th,
} from "@/components/ui";
import { DISTRICTS, ITEMS, ItemKey, disasterExtra } from "@/lib/data";
import { NeedRow, fmt, needRows } from "@/lib/needs";
import { useApp } from "@/lib/store";

const PAGE = 25;

export default function Limits() {
  const { mode, adjustments, confirmedAreas, addAdjustment, feedback } = useApp();
  const [item, setItem] = useState<ItemKey>("food");
  const [district, setDistrict] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<NeedRow | null>(null);
  const [change, setChange] = useState(100);
  const [reason, setReason] = useState("");
  const [approved, setApproved] = useState<Set<number>>(new Set());

  const rows = useMemo(() => {
    let r = needRows(item, mode, adjustments, confirmedAreas);
    if (district) r = r.filter((x) => x.area.district === district);
    if (q) r = r.filter((x) => x.area.ds.toLowerCase().includes(q.toLowerCase()));
    return r;
  }, [item, mode, adjustments, confirmedAreas, district, q]);
  const unit = ITEMS[item].unit;

  return (
    <>
      <PageHeader
        title="Limits"
        subtitle={mode === "disaster"
          ? "Disaster Mode: affected DS divisions get extra limit = predicted people affected x item factor x surge."
          : "Monthly limit per DS division = population x poverty rate x item factor."}
      />

      {!!feedback.length && (
        <Card title="Field reports from collectors" className="mb-6 border-amber-200">
          <ul className="divide-y divide-line">
            {feedback.map((f, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <div>
                  <p className="text-ink"><b>{f.ds}</b>, {f.district} needs <b className="tabular-nums">+{fmt(f.qty)}</b> {ITEMS[f.item].noun}
                    <Badge tone={f.urgency === "Urgent" ? "red" : "amber"} className="ml-2">{f.urgency}</Badge></p>
                  <p className="text-ink-muted">{f.by} · {f.time}{f.note && ` · "${f.note}"`}</p>
                </div>
                {approved.has(i) ? <Badge tone="green">Limit raised</Badge> : (
                  <Button size="sm" onClick={() => {
                    addAdjustment({ ds: f.ds, district: f.district, item: f.item, change: f.qty, reason: `Collector field report (${f.urgency.toLowerCase()})`, by: "Field report", time: "now" });
                    setApproved(new Set(approved).add(i));
                  }}>Approve +{fmt(f.qty)}</Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ItemTabs value={item} onChange={(k) => { setItem(k); setShown(PAGE); }} />
        <div className="relative min-w-[200px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input placeholder="Search DS division" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">All districts</option>
          {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </Select>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>DS division</Th><Th>Priority</Th><Th className="text-right">Base limit</Th><Th className="text-right">Adjusted</Th>
              {mode === "disaster" && <Th className="text-right">Disaster extra</Th>}
              <Th className="text-right">Total limit</Th><Th className="text-right">Used</Th><Th>Usage</Th><Th />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((r) => (
              <tr key={r.area.id} className="hover:bg-gray-50/60">
                <Td><p className="font-medium text-ink">{r.area.ds}</p><p className="text-xs text-ink-muted">{r.area.district} · pop {fmt(r.area.population)} · poverty {r.area.poverty}%</p></Td>
                <Td><LevelBadge level={r.affected?.priority ?? r.level} /></Td>
                <Td className="text-right tabular-nums">{fmt(r.area.limit[item])}</Td>
                <Td className="text-right tabular-nums">{r.adjusted ? <span className="text-brand-700">+{fmt(r.adjusted)}</span> : "-"}</Td>
                {mode === "disaster" && <Td className="text-right tabular-nums">{r.affected ? <span className="text-danger-700">+{fmt(disasterExtra(r.affected, item))}</span> : "-"}</Td>}
                <Td className="text-right font-medium tabular-nums text-ink">{fmt(r.limit)}</Td>
                <Td className="text-right tabular-nums">{fmt(r.used)}</Td>
                <Td><Meter pct={r.pct} /></Td>
                <Td className="text-right">
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(r); setChange(100); setReason(""); }}>
                    <SlidersHorizontal size={14} /> Adjust
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!rows.length && <EmptyState text="No DS divisions match." />}
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-soft">
          <span>Showing {Math.min(shown, rows.length)} of {rows.length} DS divisions</span>
          {shown < rows.length && <button onClick={() => setShown(shown + PAGE)} className="font-medium text-brand-700 hover:underline">Show more</button>}
        </div>
      </Card>

      <Card title="Limit changes" className="mt-6">
        <Table>
          <thead><tr><Th>When</Th><Th>DS division</Th><Th>Item</Th><Th className="text-right">Change</Th><Th>Reason</Th><Th>By</Th></tr></thead>
          <tbody>
            {adjustments.map((a, i) => (
              <tr key={i}>
                <Td>{a.time}</Td>
                <Td className="text-ink">{a.ds}, {a.district}</Td>
                <Td>{ITEMS[a.item].label}</Td>
                <Td className="text-right tabular-nums">{a.change > 0 ? "+" : ""}{fmt(a.change)}</Td>
                <Td>{a.reason}</Td>
                <Td>{a.by}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Adjust ${ITEMS[item].label.toLowerCase()} limit`}>
        {editing && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            addAdjustment({ ds: editing.area.ds, district: editing.area.district, item, change, reason: reason || "Manual adjustment", by: "Coordinator", time: "now" });
            setEditing(null);
          }}>
            <p className="text-sm text-ink-soft"><b className="text-ink">{editing.area.ds}</b>, {editing.area.district} · current limit <b className="tabular-nums text-ink">{fmt(editing.limit)}</b> {unit}, used {fmt(editing.used)}</p>
            <Field label={`Change (${unit})`} hint="Use a negative number to lower the limit">
              <Input type="number" value={change} onChange={(e) => setChange(Number(e.target.value))} />
            </Field>
            <Field label="Reason"><Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. field report: 40 families displaced" /></Field>
            <p className="text-sm text-ink-soft">New limit: <b className="tabular-nums text-ink">{fmt(Math.max(0, editing.limit + change))}</b> {unit}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit">Save limit</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
