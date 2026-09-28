"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { CURRENT_COLLECTOR, DISTRICTS, DS_AREAS, FieldFeedback, ITEM_KEYS, ITEMS, ItemKey } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function FieldReport() {
  const { feedback, addFeedback } = useApp();
  const [district, setDistrict] = useState(CURRENT_COLLECTOR.district);
  const dsList = useMemo(() => DS_AREAS.filter((d) => d.district === district).map((d) => d.ds).sort(), [district]);
  const [ds, setDs] = useState(dsList[0] ?? "");
  const [item, setItem] = useState<ItemKey>("food");
  const [qty, setQty] = useState(100);
  const [urgency, setUrgency] = useState<FieldFeedback["urgency"]>("Urgent");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHeader title="Field Report" subtitle="Seen more need than the limit allows? Report it - the coordinator reviews it and raises the limit." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="New report">
          <form className="space-y-4 p-5" onSubmit={(e) => {
            e.preventDefault();
            addFeedback({ ds, district, item, qty, urgency, note, by: CURRENT_COLLECTOR.name, time: "just now" });
            setSent(true); setNote("");
          }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="District">
                <Select value={district} onChange={(e) => { setDistrict(e.target.value); setDs(DS_AREAS.find((d) => d.district === e.target.value)?.ds ?? ""); }}>
                  {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="DS division">
                <Select value={ds} onChange={(e) => setDs(e.target.value)}>{dsList.map((d) => <option key={d}>{d}</option>)}</Select>
              </Field>
              <Field label="Item needed">
                <Select value={item} onChange={(e) => setItem(e.target.value as ItemKey)}>{ITEM_KEYS.map((k) => <option key={k} value={k}>{ITEMS[k].label}</option>)}</Select>
              </Field>
              <Field label={`Extra quantity (${ITEMS[item].unit})`}>
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </Field>
            </div>
            <Field label="Urgency">
              <div className="flex gap-2">
                {(["Urgent", "Soon", "Normal"] as const).map((u) => (
                  <label key={u} className="flex-1 cursor-pointer rounded-lg border border-line px-3 py-2 text-center text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:font-medium has-[:checked]:text-brand-700">
                    <input type="radio" name="urgency" className="sr-only" checked={urgency === u} onChange={() => setUrgency(u)} />{u}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="What did you see?">
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 45 families in the temple hall, no dry rations left" />
            </Field>
            <div className="flex items-center justify-end gap-3">
              {sent && <span className="text-sm text-brand-700">Sent for review</span>}
              <Button type="submit"><Send size={16} />Send report</Button>
            </div>
          </form>
        </Card>

        <Card title="Your reports">
          <ul className="divide-y divide-line">
            {feedback.map((f, i) => (
              <li key={i} className="px-5 py-3.5 text-sm">
                <p className="text-ink"><b>{f.ds}</b>, {f.district}: +{fmt(f.qty)} {ITEMS[f.item].unit} <Badge tone={f.urgency === "Urgent" ? "red" : "amber"} className="ml-1">{f.urgency}</Badge></p>
                {f.note && <p className="mt-0.5 text-ink-soft">{f.note}</p>}
                <p className="mt-0.5 text-xs text-ink-muted">{f.time} · waiting for coordinator review</p>
              </li>
            ))}
          </ul>
          {!feedback.length && <EmptyState text="No reports yet." />}
        </Card>
      </div>
    </>
  );
}
