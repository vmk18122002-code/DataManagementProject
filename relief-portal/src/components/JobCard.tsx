import { ArrowRight, Building2, MapPin, Package, Phone } from "lucide-react";
import { Donation, ITEMS } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { Card, StatusBadge } from "./ui";

export function JobCard({
  d, from, to, toLabel, org, action,
}: {
  d: Donation;
  from: string;
  to: string;
  toLabel?: string;   // e.g. "DS Office" or "Donor address"
  org?: string;       // collector organisation name
  action: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          {/* header row */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{d.id}</p>
            <StatusBadge status={d.status} />
            {org && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                <Building2 size={11} />{org}
              </span>
            )}
          </div>

          {/* items */}
          <p className="mt-1.5 flex items-center gap-1.5 text-sm tabular-nums text-ink-soft">
            <Package size={14} className="flex-shrink-0" />
            {d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].noun}`).join(" · ")}
          </p>

          {/* route: FROM → TO */}
          <div className="mt-3 flex flex-wrap items-start gap-x-2 gap-y-1 text-sm">
            <div className="flex items-start gap-1.5">
              <MapPin size={15} className="mt-0.5 flex-shrink-0 text-ink-muted" />
              <div>
                <p className="text-xs text-ink-muted">Pickup from donor</p>
                <p className="font-medium text-ink">{from}</p>
              </div>
            </div>
            <ArrowRight size={15} className="mt-4 flex-shrink-0 text-ink-muted" />
            <div className="flex items-start gap-1.5">
              <Building2 size={15} className="mt-0.5 flex-shrink-0 text-brand-600" />
              <div>
                <p className="text-xs font-medium text-brand-700">{toLabel ?? "Deliver to"}</p>
                <p className="font-medium text-ink">{to}</p>
              </div>
            </div>
          </div>

          {/* donor contact */}
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
            <Phone size={14} />
            {d.donor} ·{" "}
            <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="text-brand-700 hover:underline">
              {d.phone}
            </a>
          </p>
        </div>
        <div className="flex gap-2">{action}</div>
      </div>
    </Card>
  );
}
