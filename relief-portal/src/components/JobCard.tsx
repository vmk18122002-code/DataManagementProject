import { ArrowRight, MapPin, Phone } from "lucide-react";
import { Donation, ITEMS } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { Card, StatusBadge } from "./ui";

export function JobCard({ d, from, to, action }: { d: Donation; from: string; to: string; action: React.ReactNode }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><p className="font-semibold text-ink">{d.id}</p><StatusBadge status={d.status} /></div>
          <p className="mt-1 tabular-nums text-ink-soft">{d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].noun}`).join(" · ")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-ink"><MapPin size={15} className="text-ink-muted" />{from}</span>
            <ArrowRight size={15} className="text-ink-muted" />
            <span className="text-ink">{to}</span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
            <Phone size={14} />{d.donor} · <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="text-brand-700 hover:underline">{d.phone}</a>
          </p>
        </div>
        <div className="flex gap-2">{action}</div>
      </div>
    </Card>
  );
}
