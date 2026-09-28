"use client";

import { HandHeart, MapPinned, PackageCheck } from "lucide-react";
import { Card, EmptyState, PageHeader, StatCard, StatusBadge, Table, Td, Th } from "@/components/ui";
import { CURRENT_DONOR, ITEMS } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function DonorHistory() {
  const { donations } = useApp();
  const mine = donations.filter((d) => d.email === CURRENT_DONOR.email);
  const delivered = mine.filter((d) => d.status === "Delivered");
  const units = delivered.reduce((s, d) => s + d.items.reduce((a, i) => a + i.qty, 0), 0);
  const areas = new Set(delivered.map((d) => d.targetDs)).size;

  return (
    <>
      <PageHeader title="Donation History" subtitle="Everything you have given, and where it went." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Donations made" value={mine.length} icon={<HandHeart size={18} />} />
        <StatCard label="Items delivered" value={fmt(units)} icon={<PackageCheck size={18} />} />
        <StatCard label="Areas helped" value={areas} icon={<MapPinned size={18} />} />
      </div>
      <Card>
        <Table>
          <thead>
            <tr><Th>Date</Th><Th>Donation ID</Th><Th>Items</Th><Th>Delivered to</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {mine.map((d) => (
              <tr key={d.id}>
                <Td className="tabular-nums">{d.date}</Td>
                <Td className="font-medium text-ink">{d.id}</Td>
                <Td>{d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].unit}`).join(", ")}</Td>
                <Td>{d.targetDs}, {d.targetDistrict}</Td>
                <Td><StatusBadge status={d.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!mine.length && <EmptyState text="No donations yet." />}
      </Card>
    </>
  );
}
