"use client";

import { useState } from "react";
import { Siren } from "lucide-react";
import { ModeCard } from "@/components/ModeCard";
import { Button, Card, Field, PageHeader, Select, Textarea, cx } from "@/components/ui";
import { DISTRICTS } from "@/lib/data";
import { useApp } from "@/lib/store";

const HAZARDS = ["Flood", "Landslide", "Cyclone / wind", "Heavy rain", "Drought", "Tsunami / coastal"];

export default function Manual() {
  const { mode, activateDisaster } = useApp();
  const [hazard, setHazard] = useState(HAZARDS[0]);
  const [severity, setSeverity] = useState("Red");
  const [districts, setDistricts] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  const toggle = (d: string) => { const s = new Set(districts); if (s.has(d)) s.delete(d); else s.add(d); setDistricts(s); };

  return (
    <>
      <PageHeader title="Manual Activation" subtitle="Use this when alert sources are down or a disaster is reported by phone or field teams." />
      <ModeCard />
      <Card>
        <form className="space-y-6 p-5 sm:p-6" onSubmit={(e) => {
          e.preventDefault();
          activateDisaster();
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Disaster type">
              <Select value={hazard} onChange={(e) => setHazard(e.target.value)}>{HAZARDS.map((h) => <option key={h}>{h}</option>)}</Select>
            </Field>
            <Field label="Severity">
              <Select value={severity} onChange={(e) => setSeverity(e.target.value)}><option>Red</option><option>Amber</option><option>Yellow</option></Select>
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Affected districts <span className="font-normal text-ink-muted">({districts.size} selected)</span></p>
            <div className="flex flex-wrap gap-2">
              {DISTRICTS.map((d) => (
                <button type="button" key={d} onClick={() => toggle(d)} aria-pressed={districts.has(d)}
                  className={cx("rounded-full border px-3 py-1.5 text-sm transition-colors",
                    districts.has(d) ? "border-danger-600 bg-danger-50 font-medium text-danger-700" : "border-line text-ink-soft hover:bg-gray-50")}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Field label="Details" hint="Which DS divisions, source of the report, what is needed">
            <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Kalu Ganga overflowing - Ayagama and Kalawana DS divisions, 300 families moved to schools" />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="danger" disabled={!districts.size || mode === "disaster"}>
              <Siren size={18} /> Activate Disaster Mode
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
