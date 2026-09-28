"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { ModeCard } from "@/components/ModeCard";
import { Badge, Button, Card, PageHeader, StatusBadge, cx } from "@/components/ui";
import { useApp } from "@/lib/store";

const SOURCES = ["DMC", "NBRO", "Met Department", "GDACS", "RISE Sri Lanka"];

export default function Alerts() {
  const { alerts, setAlertStatus, activateDisaster } = useApp();
  const [checked, setChecked] = useState("06:32");
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setChecked(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      setLoading(false);
    }, 900);
  };

  return (
    <>
      <PageHeader title="Disaster Alerts" subtitle="Alerts fetched from official sources every 15 minutes. An officer must confirm before Disaster Mode starts."
        actions={<Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCw size={16} className={cx(loading && "animate-spin")} />Fetch alerts</Button>} />
      <ModeCard />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-soft">Sources · last checked {checked}:</span>
        {SOURCES.map((s) => <Badge key={s} tone="green"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{s}</Badge>)}
      </div>

      <div className="space-y-4">
        {alerts.map((a) => (
          <Card key={a.id} className={cx(a.status === "Dismissed" && "opacity-60")}>
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={a.severity === "Red" ? "red" : a.severity === "Amber" ? "amber" : "gray"}>{a.severity}</Badge>
                  <Badge tone="blue">{a.hazard}</Badge>
                  <span className="text-sm text-ink-muted">{a.source} · {a.issued} · {a.id}</span>
                </div>
                <p className="mt-2 font-medium text-ink">{a.title}</p>
                <p className="mt-1 text-sm text-ink-soft">Districts: {a.districts.join(", ")}</p>
              </div>
              <div className="flex items-center gap-2">
                {a.status === "New" ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setAlertStatus(a.id, "Dismissed")}><XCircle size={16} />Dismiss</Button>
                    <Button size="sm" variant="danger" onClick={() => { setAlertStatus(a.id, "Confirmed"); activateDisaster(); }}>
                      <CheckCircle2 size={16} />Confirm & activate
                    </Button>
                  </>
                ) : (
                  <>
                    <StatusBadge status={a.status} />
                    {a.status === "Confirmed" && <Link href="/disaster/affected" className="text-sm font-medium text-brand-700 hover:underline">View affected areas</Link>}
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
