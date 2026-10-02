"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  BookOpen, CheckCircle2, ChevronRight, Heart, MapPin, Package, ShirtIcon, Sparkles, Utensils, Wallet,
} from "lucide-react";
import { Button, Card, Field, Input, LevelBadge, PageHeader, Select, Textarea } from "@/components/ui";
import { CURRENT_DONOR, DISTRICTS, ItemKey, ITEMS } from "@/lib/data";
import { fmt, suggestAllocation } from "@/lib/needs";
import { useApp } from "@/lib/store";

type DonationCategory = ItemKey | "money";

const CATEGORIES = [
  {
    key: "food" as DonationCategory,
    label: "Food Packs",
    description: "Ready-to-eat meals & dry rations",
    unit: "packs",
    icon: <Utensils size={28} />,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    minQty: 1,
    defaultQty: 50,
  },
  {
    key: "clothes" as DonationCategory,
    label: "Clothes",
    description: "New or gently-used clothing sets",
    unit: "sets",
    icon: <ShirtIcon size={28} />,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    minQty: 1,
    defaultQty: 20,
  },
  {
    key: "books" as DonationCategory,
    label: "Books & Supplies",
    description: "School books, stationery & kits",
    unit: "books",
    icon: <BookOpen size={28} />,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    minQty: 1,
    defaultQty: 100,
  },
  {
    key: "money" as DonationCategory,
    label: "Money Donation",
    description: "Fund allocated to highest-need area",
    unit: "LKR",
    icon: <Wallet size={28} />,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    minQty: 100,
    defaultQty: 5000,
  },
];

const PACK_OPTIONS = [5, 10, 15, 20, 25, 30];

export default function DonatePage() {
  return (
    <Suspense>
      <DonateFlow />
    </Suspense>
  );
}

function StepDots({ step }: { step: number }) {
  const labels = ["Choose", "Details", "Confirm"];
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
              i < step
                ? "bg-brand-600 text-white"
                : i === step
                ? "bg-brand-600 text-white shadow-md shadow-brand-200"
                : "bg-gray-100 text-ink-muted"
            }`}
          >
            {i < step ? <CheckCircle2 size={16} /> : i + 1}
          </div>
          <span className={`text-sm font-medium ${i === step ? "text-ink" : "text-ink-muted"}`}>
            {l}
          </span>
          {i < labels.length - 1 && <ChevronRight size={16} className="text-gray-300" />}
        </div>
      ))}
    </div>
  );
}

function DonateFlow() {
  const params = useSearchParams();
  const { mode, adjustments, confirmedAreas, addDonation } = useApp();
  const presetItem = (params.get("item") as ItemKey) || null;

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<DonationCategory | null>(presetItem);
  const [qty, setQty] = useState<number>(
    CATEGORIES.find((c) => c.key === presetItem)?.defaultQty ?? 50
  );
  const [packSize, setPackSize] = useState(10);
  const [donorDistrict, setDonorDistrict] = useState(CURRENT_DONOR.district);
  const [name, setName] = useState(CURRENT_DONOR.name);
  const [phone, setPhone] = useState(CURRENT_DONOR.phone);
  const [email, setEmail] = useState(CURRENT_DONOR.email);
  const [address, setAddress] = useState(CURRENT_DONOR.address);
  const [pickupDate, setPickupDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("Morning (8am - 12pm)");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const cat = CATEGORIES.find((c) => c.key === selected) ?? null;

  const predictions = useMemo(() => {
    if (!selected || selected === "money" || !qty) return [];
    return suggestAllocation(selected as ItemKey, qty, donorDistrict, mode, adjustments, confirmedAreas, 4);
  }, [selected, qty, donorDistrict, mode, adjustments, confirmedAreas]);

  const topDest = predictions[0] ?? null;

  if (done) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
            <CheckCircle2 size={42} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-ink">Thank you, {name.split(" ")[0]}!</h1>
          <p className="mt-3 text-ink-soft">
            Donation <span className="font-semibold text-ink">{done}</span> has been received.
            {topDest && (
              <> Your <span className="font-semibold text-ink">{qty} {cat?.unit}</span> will go to{" "}
                <span className="font-semibold text-ink">{topDest.row.area.ds}</span>, {topDest.row.area.district}.
              </>
            )}
          </p>
          <p className="mt-2 text-sm text-ink-muted">A collector from your district will contact you to arrange pickup.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/donor/donations" className="rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">
              Track donation
            </Link>
            <Link href="/donor" className="rounded-xl border border-line px-5 py-2.5 font-medium text-ink hover:bg-gray-50">
              Back to needed areas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === 0) {
    return (
      <>
        <PageHeader
          title="Make a Donation"
          subtitle="Choose what you want to donate, set the quantity, and we'll predict the best area that needs it."
        />
        <StepDots step={0} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((c) => {
            const active = selected === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => { setSelected(c.key); setQty(c.defaultQty); }}
                className={`group relative flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  active ? `${c.border} ${c.bg} shadow-md` : "border-line bg-white hover:border-gray-300"
                }`}
              >
                {active && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600">
                    <CheckCircle2 size={14} className="text-white" />
                  </span>
                )}
                <span className={`rounded-xl p-2.5 ${active ? c.bg : "bg-gray-100 group-hover:bg-gray-50"} ${c.color}`}>
                  {c.icon}
                </span>
                <div>
                  <p className="font-semibold text-ink">{c.label}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{c.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {cat && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card title="Set quantity">
              <div className="p-5">
                <Field label={`How many ${cat.unit} are you donating?`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(cat.minQty, qty - (cat.key === "money" ? 500 : 5)))}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-white text-xl font-medium text-ink hover:bg-gray-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={cat.minQty}
                      value={qty}
                      onChange={(e) => setQty(Math.max(cat.minQty, Number(e.target.value)))}
                      className="h-11 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-center text-lg font-semibold text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(qty + (cat.key === "money" ? 500 : 5))}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-white text-xl font-medium text-ink hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">Unit: {cat.unit}</p>
                </Field>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(cat.key === "money"
                    ? [1000, 5000, 10000, 25000, 50000]
                    : cat.key === "books"
                    ? [50, 100, 250, 500, 1000]
                    : [10, 25, 50, 100, 200]
                  ).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setQty(v)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        qty === v
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-line text-ink-soft hover:border-brand-300 hover:text-ink"
                      }`}
                    >
                      {cat.key === "money" ? `LKR ${v.toLocaleString()}` : v}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {selected === "books" && (
              <Card title="FOG distribution pack setup">
                <div className="p-5">
                  <p className="mb-4 text-sm text-ink-soft">
                    FOG (Family of God) packs bundle books for distribution. Choose how many books go in each pack.
                  </p>
                  <Field label="Books per pack">
                    <div className="grid grid-cols-3 gap-2">
                      {PACK_OPTIONS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPackSize(n)}
                          className={`flex flex-col items-center rounded-xl border-2 p-3 transition-all ${
                            packSize === n
                              ? "border-violet-400 bg-violet-50 text-violet-700"
                              : "border-line bg-white hover:border-violet-200 hover:bg-violet-50"
                          }`}
                        >
                          <Package size={18} className="mb-1" />
                          <span className="text-lg font-bold">{n}</span>
                          <span className="text-xs text-ink-muted">books</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                  {qty > 0 && (
                    <div className="mt-4 rounded-xl bg-violet-50 p-4 text-sm">
                      <p className="font-semibold text-violet-800">
                        {Math.floor(qty / packSize)} complete packs
                        {qty % packSize > 0 && (
                          <span className="font-normal text-violet-600"> + {qty % packSize} extra books</span>
                        )}
                      </p>
                      <p className="mt-1 text-violet-600">
                        {qty} books divided by {packSize} per pack = {Math.floor(qty / packSize)} packs
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {selected === "money" && (
              <Card title="Estimated impact">
                <div className="p-5 space-y-3">
                  <p className="text-sm text-ink-soft">Your donation will be split across the highest-need items:</p>
                  {[
                    { label: "Food packs", pct: 50, color: "bg-orange-400" },
                    { label: "Clothes sets", pct: 30, color: "bg-sky-400" },
                    { label: "Books & supplies", pct: 20, color: "bg-violet-400" },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-ink">{row.label}</span>
                        <span className="font-semibold text-ink">
                          LKR {Math.round((qty * row.pct) / 100).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {cat && (
          <Card className="mt-6" title="Your location">
            <div className="p-5">
              <Field label="Which district are you donating from?">
                <Select value={donorDistrict} onChange={(e) => setDonorDistrict(e.target.value)} className="w-full">
                  {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <p className="mt-2 text-xs text-ink-muted">We use this to find the closest area that needs your donation most.</p>
            </div>
          </Card>
        )}

        {cat && selected !== "money" && predictions.length > 0 && (
          <div className="mt-6 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
            <div className="mb-4 flex items-center gap-2 text-brand-700">
              <Sparkles size={20} />
              <p className="font-semibold">Predicted needed places for your donation</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {predictions.map((p, i) => (
                <div
                  key={p.row.area.id}
                  className={`relative rounded-xl border p-4 transition-all ${
                    i === 0 ? "border-brand-300 bg-white shadow-sm" : "border-line bg-white"
                  }`}
                >
                  {i === 0 && (
                    <span className="absolute -top-2 left-3 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                      Best match
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{p.row.area.ds}</p>
                      <p className="text-xs text-ink-muted">{p.row.area.district}</p>
                    </div>
                    <LevelBadge level={p.row.affected?.priority ?? p.row.level} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center gap-1.5 text-ink-soft">
                      <MapPin size={13} />
                      <span>{p.km} km away</span>
                    </div>
                    <p className="text-ink-soft">
                      Needs <span className="font-semibold text-ink">{fmt(p.row.remaining)}</span>{" "}
                      {ITEMS[selected as ItemKey].unit}
                    </p>
                    <p className="text-xs text-ink-muted">{p.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            disabled={!selected || qty < (cat?.minQty ?? 1)}
            onClick={() => setStep(1)}
            className="px-8 py-3 text-base"
          >
            Continue to details <ChevronRight size={18} />
          </Button>
        </div>
      </>
    );
  }

  if (step === 1) {
    return (
      <>
        <PageHeader title="Your Details" subtitle="We need a few details so a collector can pick up your donation." />
        <StepDots step={1} />
        <div className="mx-auto max-w-2xl space-y-6">
          <Card title="Contact information">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Full name / organisation">
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Phone number">
                <Input required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="District">
                <Select value={donorDistrict} onChange={(e) => setDonorDistrict(e.target.value)}>
                  {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          <Card title="Pickup details">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Pickup address">
                  <Input required value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
              </div>
              <Field label="Preferred date">
                <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
              </Field>
              <Field label="Time window">
                <Select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)}>
                  <option>Morning (8am - 12pm)</option>
                  <option>Afternoon (12pm - 4pm)</option>
                  <option>Evening (4pm - 7pm)</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes for the collector (optional)">
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. items are packed in 5 boxes, call before arriving"
                  />
                </Field>
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)} className="flex-1 py-3">Back</Button>
            <Button
              disabled={!name || !phone || !email || !address}
              onClick={() => setStep(2)}
              className="flex-1 py-3 text-base"
            >
              Review and confirm <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </>
    );
  }

  const donationId = `DN-${1043 + Math.floor(Math.random() * 900)}`;

  const handleSubmit = () => {
    if (!selected) return;
    if (selected !== "money" && topDest) {
      addDonation({
        id: donationId,
        donor: name,
        phone,
        email,
        address,
        district: donorDistrict,
        items: [{ item: selected as ItemKey, qty }],
        targetDs: topDest.row.area.ds,
        targetDistrict: topDest.row.area.district,
        date: pickupDate || new Date().toISOString().slice(0, 10),
        status: "Allocated",
      });
    }
    setDone(donationId);
  };

  return (
    <>
      <PageHeader title="Confirm Donation" subtitle="Review your donation details before submitting." />
      <StepDots step={2} />
      <div className="mx-auto max-w-2xl space-y-6">
        <Card title="Donation summary">
          <div className="divide-y divide-line">
            {[
              { label: "Category", value: cat?.label },
              { label: "Quantity", value: `${qty.toLocaleString()} ${cat?.unit}` },
              ...(selected === "books"
                ? [{ label: "FOG pack size", value: `${packSize} books/pack = ${Math.floor(qty / packSize)} packs` }]
                : []),
              { label: "Donor", value: name },
              { label: "Phone", value: phone },
              { label: "Pickup address", value: address },
              { label: "District", value: donorDistrict },
              { label: "Pickup date", value: pickupDate || "Flexible" },
              { label: "Time window", value: timeWindow },
              ...(notes ? [{ label: "Notes", value: notes }] : []),
            ].map((row) => (
              <div key={row.label} className="flex gap-4 px-5 py-3 text-sm">
                <span className="w-36 flex-shrink-0 text-ink-muted">{row.label}</span>
                <span className="font-medium text-ink">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {selected !== "money" && predictions.length > 0 && (
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
            <div className="mb-3 flex items-center gap-2 text-brand-700">
              <Sparkles size={20} />
              <p className="font-semibold">Where your donation will go</p>
            </div>
            <div className="space-y-3">
              {predictions.slice(0, 2).map((p, i) => (
                <div key={p.row.area.id} className="rounded-xl border border-brand-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {i === 0 && (
                          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">Primary</span>
                        )}
                        {i === 1 && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-ink-soft">Overflow</span>
                        )}
                        <p className="font-semibold text-ink">{p.row.area.ds}, {p.row.area.district}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">{p.reason}</p>
                    </div>
                    <div className="text-right">
                      <LevelBadge level={p.row.affected?.priority ?? p.row.level} />
                      <p className="mt-1 text-xs text-ink-muted">{p.km} km</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    Allocating{" "}
                    <span className="font-semibold text-ink">
                      {fmt(p.qty)} {ITEMS[selected as ItemKey].unit}
                    </span>{" "}
                    - {fmt(p.row.remaining)} still needed
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setStep(1)} className="flex-1 py-3">Back</Button>
          <Button onClick={handleSubmit} className="flex-1 py-3 text-base">
            <Heart size={18} /> Donate now
          </Button>
        </div>
      </div>
    </>
  );
}
