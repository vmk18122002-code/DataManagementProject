"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, EmptyState, Input, PageHeader, Select, StatusBadge, Table, Td, Th } from "@/components/ui";
import { COLLECTORS, ITEMS, STATUS_FLOW } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function DonorData() {
  const { donations, updateDonation } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => donations.filter((d) =>
    (!status || d.status === status) &&
    (!q || `${d.id} ${d.donor} ${d.district} ${d.targetDs}`.toLowerCase().includes(q.toLowerCase()))), [donations, q, status]);

  return (
    <>
      <PageHeader title="Donor Data" subtitle="All donations, pickup details and the area each one is allocated to." />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input placeholder="Search by donation ID, donor or area" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">All status</option>
          {STATUS_FLOW.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </div>
      <Card>
        <Table>
          <thead>
            <tr><Th>Donation</Th><Th>Donor</Th><Th>Items</Th><Th>Pickup address</Th><Th>Allocated to</Th><Th>Collector</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const local = COLLECTORS.filter((c) => c.district === d.district);
              const options = local.length ? local : COLLECTORS;
              return (
                <tr key={d.id} className="hover:bg-gray-50/60">
                  <Td><p className="font-medium text-ink">{d.id}</p><p className="text-xs tabular-nums text-ink-muted">{d.date}</p></Td>
                  <Td><p className="text-ink">{d.donor}</p><p className="text-xs text-ink-muted">{d.phone}</p></Td>
                  <Td>{d.items.map((i) => <p key={i.item} className="tabular-nums">{fmt(i.qty)} {ITEMS[i.item].unit}</p>)}</Td>
                  <Td><p>{d.address}</p><p className="text-xs text-ink-muted">{d.district}</p></Td>
                  <Td><p className="text-ink">{d.targetDs}</p><p className="text-xs text-ink-muted">{d.targetDistrict}</p></Td>
                  <Td>
                    {d.collector ?? (
                      <Select className="h-9 w-44 py-1 text-sm" defaultValue=""
                        onChange={(e) => e.target.value && updateDonation(d.id, { collector: e.target.value, status: "Collector assigned" })}>
                        <option value="">Assign collector</option>
                        {options.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.district})</option>)}
                      </Select>
                    )}
                  </Td>
                  <Td><StatusBadge status={d.status} /></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {!rows.length && <EmptyState text="No results found." />}
        <p className="border-t border-line px-4 py-3 text-sm text-ink-soft">Showing {rows.length} of {donations.length} donations</p>
      </Card>
    </>
  );
}
