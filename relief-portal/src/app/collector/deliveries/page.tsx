"use client";

import { Camera, CheckCircle2, FileCheck2, ImageIcon, MapPin, Warehouse } from "lucide-react";
import { useRef, useState } from "react";
import { JobCard } from "@/components/JobCard";
import { Button, Card, EmptyState, Field, PageHeader, Textarea } from "@/components/ui";
import { CURRENT_COLLECTOR, Donation } from "@/lib/data";
import { useApp } from "@/lib/store";

function StoreProofPanel({ d, onDone }: { d: Donation; onDone: () => void }) {
  const { updateDonation } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="border-t border-line bg-amber-50/60 px-5 py-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
        <Camera size={16} /> Upload store room proof (voucher)
      </p>
      <p className="mb-3 text-xs text-amber-700">
        Photo of items at <strong>{CURRENT_COLLECTOR.org}</strong> store room. Donors will see this.
      </p>
      <div
        onClick={() => fileRef.current?.click()}
        className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-white p-4 hover:border-amber-400 transition-colors"
      >
        {photoUrl
          ? <img src={photoUrl} alt="proof" className="max-h-36 rounded-lg object-cover" />
          : <><ImageIcon size={28} className="mb-1 text-amber-400" /><p className="text-sm text-amber-700">Click to upload photo</p></>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <Field label="Voucher note (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. 50 food packs received, all sealed" />
      </Field>
      <Button size="sm" disabled={!photoUrl} className="mt-3 gap-2"
        onClick={() => {
          if (!photoUrl) return;
          updateDonation(d.id, {
            status: "Delivered",
            proof: { photoUrl, note: note || "Items received at organisation store room.", time: new Date().toISOString(), org: CURRENT_COLLECTOR.org },
          });
          onDone();
        }}>
        <FileCheck2 size={16} /> Submit store proof
      </Button>
    </div>
  );
}

function AreaProofPanel({ d, onDone }: { d: Donation; onDone: () => void }) {
  const { updateDonation } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="border-t border-line bg-brand-50/60 px-5 py-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-800">
        <Camera size={16} /> Confirm items reached target area
      </p>
      <p className="mb-3 text-xs text-brand-700">
        Upload a photo taken at <strong>{d.targetDs}</strong>, {d.targetDistrict} showing items have arrived.
        Donors and coordinators will see this final confirmation.
      </p>
      <div
        onClick={() => fileRef.current?.click()}
        className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-white p-4 hover:border-brand-400 transition-colors"
      >
        {photoUrl
          ? <img src={photoUrl} alt="area proof" className="max-h-36 rounded-lg object-cover" />
          : <>
              <MapPin size={28} className="mb-1 text-brand-400" />
              <p className="text-sm text-brand-700">Photo at {d.targetDs}</p>
            </>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <Field label="Field confirmation note">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={`e.g. Items handed over at ${d.targetDs} DS area`} />
      </Field>
      <Button size="sm" disabled={!photoUrl} className="mt-3 gap-2"
        onClick={() => {
          if (!photoUrl) return;
          updateDonation(d.id, {
            status: "Reached area",
            areaProof: { photoUrl, note: note || `Items reached ${d.targetDs}.`, time: new Date().toISOString(), by: CURRENT_COLLECTOR.org },
          });
          onDone();
        }}>
        <CheckCircle2 size={16} /> Confirm reached {d.targetDs}
      </Button>
    </div>
  );
}

export default function CollectorDeliveries() {
  const { donations } = useApp();
  const [storeProofOpen, setStoreProofOpen] = useState<string | null>(null);
  const [areaProofOpen, setAreaProofOpen] = useState<string | null>(null);

  const toStore = donations.filter((d) => d.collector === CURRENT_COLLECTOR.name && d.status === "Picked up");
  const dispatched = donations.filter((d) => d.collector === CURRENT_COLLECTOR.name && d.status === "Dispatched to area");
  const atStore = donations.filter((d) => d.collector === CURRENT_COLLECTOR.name && d.status === "Delivered" && d.proof);
  const done = donations.filter((d) => d.collector === CURRENT_COLLECTOR.name && d.status === "Reached area");

  return (
    <>
      <PageHeader
        title="Deliveries"
        subtitle={`${CURRENT_COLLECTOR.org} - Pick up, bring to store room, upload proof, then confirm items reached target area.`}
      />

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-line bg-white p-4 text-sm">
        <Warehouse size={22} className="flex-shrink-0 text-brand-600" />
        <div>
          <p className="font-semibold text-ink">Step 1: Bring to {CURRENT_COLLECTOR.org} Store Room ({CURRENT_COLLECTOR.district})</p>
          <p className="text-ink-muted">Upload store proof, coordinator dispatches, then you confirm items reached the target area.</p>
        </div>
      </div>

      {toStore.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold text-ink">Awaiting store proof ({toStore.length})</h2>
          <div className="space-y-0">
            {toStore.map((d) => (
              <div key={d.id} className="mb-3 overflow-hidden rounded-xl border border-amber-200 bg-white">
                <JobCard d={d} org={CURRENT_COLLECTOR.org}
                  from={`${d.address} (${d.district})`}
                  to={`${CURRENT_COLLECTOR.org} Store Room`}
                  toLabel="Organisation Store Room"
                  action={storeProofOpen === d.id ? null : (
                    <Button size="sm" variant="secondary" onClick={() => setStoreProofOpen(d.id)} className="gap-2">
                      <Camera size={16} /> Upload proof
                    </Button>
                  )} />
                {storeProofOpen === d.id && <StoreProofPanel d={d} onDone={() => setStoreProofOpen(null)} />}
              </div>
            ))}
          </div>
        </section>
      )}

      {atStore.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold text-ink">At store - awaiting dispatch ({atStore.length})</h2>
          <div className="space-y-3">
            {atStore.map((d) => (
              <div key={d.id} className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
                <JobCard d={d} org={CURRENT_COLLECTOR.org}
                  from={`${d.address} (${d.district})`}
                  to={`${CURRENT_COLLECTOR.org} Store Room`}
                  toLabel="Organisation Store Room"
                  action={<span className="text-sm font-medium text-emerald-700 flex items-center gap-1"><CheckCircle2 size={16}/>Store proof submitted</span>} />
                {d.proof && (
                  <div className="border-t border-emerald-100 bg-emerald-50/50 px-5 py-3 flex gap-3 items-center">
                    <img src={d.proof.photoUrl} alt="store proof" className="h-12 w-12 rounded-lg object-cover border border-emerald-200" />
                    <div className="text-xs text-emerald-700"><p className="font-medium">Store voucher submitted</p><p className="italic mt-0.5">{d.proof.note}</p></div>
                  </div>
                )}
                <p className="px-5 py-2 text-xs text-amber-600 bg-amber-50 border-t border-amber-100">Waiting for coordinator to dispatch to {d.targetDs}...</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {dispatched.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold text-ink">Dispatched - confirm reached area ({dispatched.length})</h2>
          <div className="space-y-0">
            {dispatched.map((d) => (
              <div key={d.id} className="mb-3 overflow-hidden rounded-xl border border-brand-200 bg-white">
                <JobCard d={d} org={CURRENT_COLLECTOR.org}
                  from={`${CURRENT_COLLECTOR.org} Store Room`}
                  to={`${d.targetDs}, ${d.targetDistrict}`}
                  toLabel="Target area (confirm reached)"
                  action={areaProofOpen === d.id ? null : (
                    <Button size="sm" onClick={() => setAreaProofOpen(d.id)} className="gap-2">
                      <MapPin size={16} /> Confirm reached area
                    </Button>
                  )} />
                {areaProofOpen === d.id && <AreaProofPanel d={d} onDone={() => setAreaProofOpen(null)} />}
              </div>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-ink">Reached area ({done.length})</h2>
          <div className="space-y-3">
            {done.map((d) => (
              <div key={d.id} className="overflow-hidden rounded-xl border border-brand-200 bg-white">
                <JobCard d={d} org={CURRENT_COLLECTOR.org}
                  from={`${d.address} (${d.district})`}
                  to={`${d.targetDs}, ${d.targetDistrict}`}
                  toLabel="Reached target area"
                  action={<span className="text-sm font-medium text-brand-700 flex items-center gap-1"><CheckCircle2 size={16}/>Reached {d.targetDs}</span>} />
                {d.areaProof && (
                  <div className="border-t border-brand-100 bg-brand-50/50 px-5 py-3 flex gap-3 items-center">
                    <img src={d.areaProof.photoUrl} alt="area proof" className="h-12 w-12 rounded-lg object-cover border border-brand-200" />
                    <div className="text-xs text-brand-700"><p className="font-medium">Area confirmation - {new Date(d.areaProof.time).toLocaleString()}</p><p className="italic mt-0.5">{d.areaProof.note}</p></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!toStore.length && !atStore.length && !dispatched.length && !done.length && (
        <Card><EmptyState text="No deliveries yet. Picked-up items will appear here." /></Card>
      )}
    </>
  );
}