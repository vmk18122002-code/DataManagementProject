"use client";

import { ArrowRightLeft, MapPin, Package, RefreshCw, Send, Truck } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, Field, PageHeader, Select } from "@/components/ui";
import { DS_AREAS, ITEMS, STATUS_FLOW } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

function StoreAreaGroup({ targetDs, targetDistrict, donations, onDispatch, onReroute }: {
  targetDs: string;
  targetDistrict: string;
  donations: ReturnType<typeof useApp>["donations"];
  onDispatch: (ids: string[]) => void;
  onReroute: (id: string, newDs: string, newDistrict: string) => void;
}) {
  const [rerouteId, setRerouteId] = useState<string | null>(null);
  const [newDs, setNewDs] = useState("");

  const uniqueAreas = [...new Set(DS_AREAS.map((a) => `${a.ds}||${a.district}`))];

  const totalItems = donations.flatMap((d) => d.items).reduce((acc, i) => {
    acc[i.item] = (acc[i.item] ?? 0) + i.qty;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="mb-4 overflow-hidden rounded-xl border-2 border-brand-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-brand-600" />
          <div>
            <p className="font-semibold text-brand-900">{targetDs}</p>
            <p className="text-xs text-brand-600">{targetDistrict} district</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(totalItems).map(([item, qty]) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
              <Package size={11} />{fmt(qty as number)} {ITEMS[item as keyof typeof ITEMS]?.unit}
            </span>
          ))}
          <Badge>{donations.length} {donations.length === 1 ? "donation" : "donations"}</Badge>
        </div>
      </div>

      <div className="divide-y divide-line px-4">
        {donations.map((d) => (
          <div key={d.id} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">{d.id} - {d.donor}</p>
                <p className="text-xs tabular-nums text-ink-soft">{d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].unit}`).join(", ")}</p>
                {d.collector && <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted"><Truck size={11} />{d.collector}</p>}
                {d.proof && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <img src={d.proof.photoUrl} alt="store proof" className="h-7 w-7 rounded object-cover border border-emerald-200" />
                    <p className="text-xs text-emerald-700 truncate max-w-xs">{d.proof.note}</p>
                  </div>
                )}
              </div>
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs"
                onClick={() => setRerouteId(rerouteId === d.id ? null : d.id)}>
                <ArrowRightLeft size={13} /> Re-route
              </Button>
            </div>

            {rerouteId === d.id && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-800">
                  <RefreshCw size={12} className="inline mr-1" />
                  Re-route {d.id} to a different area
                </p>
                <p className="mb-3 text-xs text-amber-700">
                  Use this if the original target area is no longer in need or a higher-priority area has emerged.
                </p>
                <Field label="New target area">
                  <Select value={newDs} onChange={(e) => setNewDs(e.target.value)}>
                    <option value="">Select new area...</option>
                    {uniqueAreas
                      .filter((a) => a !== `${targetDs}||${targetDistrict}`)
                      .map((a) => {
                        const [ds, dist] = a.split("||");
                        return <option key={a} value={a}>{ds} - {dist}</option>;
                      })}
                  </Select>
                </Field>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" disabled={!newDs}
                    onClick={() => {
                      const [ds, dist] = newDs.split("||");
                      onReroute(d.id, ds, dist);
                      setRerouteId(null);
                      setNewDs("");
                    }}>
                    Confirm re-route
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRerouteId(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-brand-100 bg-brand-50/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-brand-700">
            All items above will be dispatched together to <strong>{targetDs}</strong>
          </p>
          <Button size="sm" className="gap-2"
            disabled={donations.some((d) => !d.proof)}
            onClick={() => onDispatch(donations.map((d) => d.id))}>
            <Send size={14} /> Dispatch batch to {targetDs}
          </Button>
        </div>
        {donations.some((d) => !d.proof) && (
          <p className="mt-1 text-xs text-amber-600">
            Some donations are missing store proof from the collector - upload proof first.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Deliveries() {
  const { donations, updateDonation } = useApp();

  const atStore = donations.filter((d) => d.status === "Delivered");

  const byArea = atStore.reduce((acc, d) => {
    const key = `${d.targetDs}||${d.targetDistrict}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {} as Record<string, typeof atStore>);

  const handleDispatch = (ids: string[]) => {
    ids.forEach((id) => updateDonation(id, { status: "Dispatched to area" }));
  };

  const handleReroute = (id: string, newDs: string, newDistrict: string) => {
    updateDonation(id, { targetDs: newDs, targetDistrict: newDistrict });
  };

  return (
    <>
      <PageHeader
        title="Delivery Pipeline"
        subtitle="Donations are sorted by target area at the org store room. Dispatch each area group separately, or re-route if needed."
      />

      <div className="scroll-thin flex gap-4 overflow-x-auto pb-4 mb-8">
        {STATUS_FLOW.filter((s) => s !== "Delivered").map((s) => {
          const list = donations.filter((d) => d.status === s);
          return (
            <div key={s} className="w-64 shrink-0 rounded-xl bg-gray-100/80 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="font-medium text-ink text-sm">{s}</p>
                <Badge>{list.length}</Badge>
              </div>
              <div className="space-y-2">
                {list.map((d) => (
                  <div key={d.id} className="rounded-lg border border-line bg-white p-3 text-xs">
                    <p className="font-medium text-ink">{d.id} - {d.donor}</p>
                    <p className="mt-0.5 tabular-nums text-ink-soft">{d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].unit}`).join(", ")}</p>
                    <p className="mt-1.5 flex items-center gap-1 text-ink-muted">
                      <MapPin size={11} />{d.district} to <span className="font-medium text-ink">{d.targetDs}</span>
                    </p>
                    {d.collector && <p className="mt-1 flex items-center gap-1 text-ink-muted"><Truck size={11} />{d.collector}</p>}
                    {d.areaProof && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <img src={d.areaProof.photoUrl} alt="area proof" className="h-6 w-6 rounded object-cover" />
                        <p className="text-green-700 truncate">{d.areaProof.note}</p>
                      </div>
                    )}
                  </div>
                ))}
                {!list.length && <p className="px-1 py-3 text-center text-xs text-ink-muted">Nothing here</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-2 flex items-center gap-3">
        <h2 className="font-semibold text-ink">
          At org store room - sorted by destination ({atStore.length} donations, {Object.keys(byArea).length} areas)
        </h2>
        <Badge tone="amber">{Object.keys(byArea).length} areas</Badge>
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        Each group goes to a different target area. Dispatch separately per area. Use Re-route to change an area if priorities have shifted.
      </p>

      {Object.keys(byArea).length === 0 && (
        <Card><p className="px-5 py-8 text-center text-sm text-ink-muted">No donations at the store room right now.</p></Card>
      )}

      {Object.entries(byArea).map(([key, group]) => {
        const [targetDs, targetDistrict] = key.split("||");
        return (
          <StoreAreaGroup
            key={key}
            targetDs={targetDs}
            targetDistrict={targetDistrict}
            donations={group}
            onDispatch={handleDispatch}
            onReroute={handleReroute}
          />
        );
      })}
    </>
  );
}