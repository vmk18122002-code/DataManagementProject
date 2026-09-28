"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CheckCircle2, MapPin, Plus, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, LevelBadge, PageHeader, Select, Textarea } from "@/components/ui";
import { CURRENT_DONOR, DISTRICTS, ITEM_KEYS, ITEMS, ItemKey } from "@/lib/data";
import { fmt, suggestAllocation } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function DonatePage() {
  return (
    <Suspense>
      <DonateForm />
    </Suspense>
  );
}

function DonateForm() {
  const params = useSearchParams();
  const { mode, adjustments, confirmedAreas, addDonation } = useApp();
  const presetDs = params.get("ds");
  const presetDistrict = params.get("district");
  const presetItem = (params.get("item") as ItemKey) || "food";

  const [donor, setDonor] = useState({ ...CURRENT_DONOR, date: "", window: "Morning (8am - 12pm)", notes: "" });
  const [items, setItems] = useState<{ item: ItemKey; qty: number }[]>([{ item: presetItem, qty: 50 }]);
  const [target, setTarget] = useState<"preset" | "auto">(presetDs ? "preset" : "auto");
  const [done, setDone] = useState<string | null>(null);

  const main = items[0];
  const suggestion = useMemo(
    () => suggestAllocation(main.item, main.qty || 0, donor.district, mode, adjustments, confirmedAreas, 3),
    [main.item, main.qty, donor.district, mode, adjustments, confirmedAreas],
  );
  const dest = target === "preset" && presetDs
    ? { ds: presetDs, district: presetDistrict ?? "" }
    : suggestion[0] ? { ds: suggestion[0].row.area.ds, district: suggestion[0].row.area.district } : null;

  const set = (k: keyof typeof donor) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDonor({ ...donor, [k]: e.target.value });

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <div className="p-8 text-center">
            <CheckCircle2 size={48} className="mx-auto text-brand-600" />
            <h1 className="mt-4 text-2xl font-semibold text-ink">Thank you, {donor.name.split(" ")[0]}!</h1>
            <p className="mt-2 text-ink-soft">Your donation <b className="text-ink">{done}</b> was received and allocated to <b className="text-ink">{dest?.ds}</b>. A collector from your district will contact you to arrange pickup.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/donor/donations" className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700">Track donation</Link>
              <Link href="/donor" className="rounded-lg border border-line px-4 py-2.5 font-medium text-ink hover:bg-gray-50">Back to needed areas</Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Donate Items" subtitle="Tell us what you are giving and where to collect it. A collector will pick it up from your address." />
      <form
        className="grid gap-6 xl:grid-cols-[1fr_380px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!dest) return;
          const id = `DN-${1043 + Math.floor(Math.random() * 900)}`;
          addDonation({
            id, donor: donor.name, phone: donor.phone, email: donor.email, address: donor.address, district: donor.district,
            items: items.filter((i) => i.qty > 0), targetDs: dest.ds, targetDistrict: dest.district,
            date: donor.date || new Date().toISOString().slice(0, 10), status: "Allocated",
          });
          setDone(id);
        }}
      >
        <div className="space-y-6">
          <Card title="1. Items you are donating">
            <div className="space-y-3 p-5">
              {items.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_auto] items-end gap-3">
                  <Field label={i === 0 ? "Item" : ""}>
                    <Select value={row.item} onChange={(e) => setItems(items.map((r, j) => (j === i ? { ...r, item: e.target.value as ItemKey } : r)))}>
                      {ITEM_KEYS.map((k) => <option key={k} value={k}>{ITEMS[k].label}</option>)}
                    </Select>
                  </Field>
                  <Field label={i === 0 ? "Quantity" : ""}>
                    <Input type="number" min={1} value={row.qty}
                      onChange={(e) => setItems(items.map((r, j) => (j === i ? { ...r, qty: Number(e.target.value) } : r)))} />
                  </Field>
                  <button type="button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))}
                    className="mb-1 rounded-lg p-2.5 text-ink-muted hover:bg-gray-100 disabled:opacity-30" aria-label="Remove item">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => setItems([...items, { item: "clothes", qty: 10 }])}>
                <Plus size={16} /> Add another item
              </Button>
            </div>
          </Card>

          <Card title="2. Your details">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Full name / organisation"><Input required value={donor.name} onChange={set("name")} /></Field>
              <Field label="Phone number"><Input required value={donor.phone} onChange={set("phone")} /></Field>
              <Field label="Email"><Input type="email" required value={donor.email} onChange={set("email")} /></Field>
              <Field label="District"><Select value={donor.district} onChange={set("district")}>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
            </div>
          </Card>

          <Card title="3. Pickup">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Pickup address"><Input required value={donor.address} onChange={set("address")} /></Field></div>
              <Field label="Preferred date"><Input type="date" value={donor.date} onChange={set("date")} /></Field>
              <Field label="Time window">
                <Select value={donor.window} onChange={set("window")}>
                  <option>Morning (8am - 12pm)</option><option>Afternoon (12pm - 4pm)</option><option>Evening (4pm - 7pm)</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes for the collector (optional)">
                  <Textarea rows={3} value={donor.notes} onChange={set("notes")} placeholder="e.g. items are packed in 5 boxes, call before arriving" />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="4. Where it goes">
            <div className="space-y-3 p-5">
              {presetDs && (
                <label className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                  <input type="radio" name="target" checked={target === "preset"} onChange={() => setTarget("preset")} className="mt-1 accent-brand-600" />
                  <span><span className="block font-medium text-ink">{presetDs}</span><span className="text-sm text-ink-muted">{presetDistrict} - the area you selected</span></span>
                </label>
              )}
              <label className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input type="radio" name="target" checked={target === "auto"} onChange={() => setTarget("auto")} className="mt-1 accent-brand-600" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-ink"><MapPin size={16} className="text-brand-700" /> Choose the best area for me</span>
                  <span className="text-sm text-ink-muted">Closest high-priority area with limit left</span>
                </span>
              </label>

              {target === "auto" && (
                <div className="space-y-2 pt-1">
                  {suggestion.map((s) => (
                    <div key={s.row.area.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink">{s.row.area.ds}, {s.row.area.district}</span>
                        <LevelBadge level={s.row.affected?.priority ?? s.row.level} />
                      </div>
                      <p className="mt-1 tabular-nums text-ink-soft">{fmt(s.qty)} {ITEMS[main.item].unit} · {s.km} km</p>
                      <p className="mt-1 text-xs text-ink-muted">{s.reason}</p>
                    </div>
                  ))}
                  {!suggestion.length && <p className="text-sm text-ink-muted">No area currently needs this item.</p>}
                </div>
              )}
            </div>
          </Card>
          <Button type="submit" className="w-full py-3 text-base" disabled={!dest}>Submit donation</Button>
        </div>
      </form>
    </>
  );
}
