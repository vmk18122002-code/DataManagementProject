"use client";

import { CheckCircle2, PackageCheck } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { CURRENT_COLLECTOR } from "@/lib/data";
import { useApp } from "@/lib/store";

export default function Pickups() {
  const { donations, updateDonation } = useApp();
  const me = CURRENT_COLLECTOR.name;
  const mine = donations.filter((d) => d.collector === me && d.status === "Collector assigned");
  const open = donations.filter((d) => !d.collector && d.status === "Allocated" && d.district === CURRENT_COLLECTOR.district);

  return (
    <>
      <PageHeader title="Pickups" subtitle={`Donations to collect in ${CURRENT_COLLECTOR.district} district.`} />
      <h2 className="mb-3 font-semibold text-ink">Assigned to you ({mine.length})</h2>
      <div className="mb-8 space-y-3">
        {mine.map((d) => (
          <JobCard key={d.id} d={d} from={d.address} to={`${d.targetDs}, ${d.targetDistrict}`}
            action={<Button size="sm" onClick={() => updateDonation(d.id, { status: "Picked up" })}><PackageCheck size={16} />Mark picked up</Button>} />
        ))}
        {!mine.length && <Card><EmptyState text="No pickups assigned right now." /></Card>}
      </div>

      <h2 className="mb-3 font-semibold text-ink">Open jobs in your district ({open.length})</h2>
      <div className="space-y-3">
        {open.map((d) => (
          <JobCard key={d.id} d={d} from={d.address} to={`${d.targetDs}, ${d.targetDistrict}`}
            action={<Button size="sm" variant="secondary" onClick={() => updateDonation(d.id, { collector: me, status: "Collector assigned" })}><CheckCircle2 size={16} />Accept job</Button>} />
        ))}
        {!open.length && <Card><EmptyState text="No open jobs in your district." /></Card>}
      </div>
    </>
  );
}
