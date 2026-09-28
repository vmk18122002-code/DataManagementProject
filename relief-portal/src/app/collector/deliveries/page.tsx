"use client";

import { CheckCircle2 } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { CURRENT_COLLECTOR } from "@/lib/data";
import { useApp } from "@/lib/store";

export default function CollectorDeliveries() {
  const { donations, updateDonation } = useApp();
  const list = donations.filter((d) => d.collector === CURRENT_COLLECTOR.name && d.status === "Picked up");

  return (
    <>
      <PageHeader title="Deliveries" subtitle="Items you have picked up. Deliver them to the Divisional Secretariat of each area." />
      <div className="space-y-3">
        {list.map((d) => (
          <JobCard key={d.id} d={d} from={d.district} to={`Divisional Secretariat, ${d.targetDs} (${d.targetDistrict})`}
            action={<Button size="sm" onClick={() => updateDonation(d.id, { status: "Delivered" })}><CheckCircle2 size={16} />Mark delivered</Button>} />
        ))}
        {!list.length && <Card><EmptyState text="Nothing to deliver. Picked-up items will appear here." /></Card>}
      </div>
    </>
  );
}
