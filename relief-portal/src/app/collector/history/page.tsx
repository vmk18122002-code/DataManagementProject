"use client";

import { Card, EmptyState, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { CURRENT_COLLECTOR, ITEMS } from "@/lib/data";
import { fmt } from "@/lib/needs";
import { useApp } from "@/lib/store";

export default function CollectorHistory() {
  const { donations } = useApp();
  const done = donations.filter((d) => d.collector === CURRENT_COLLECTOR.name && d.status === "Delivered");
  return (
    <>
      <PageHeader title="History" subtitle="Donations you have delivered." />
      <Card>
        <Table>
          <thead><tr><Th>Date</Th><Th>Donation</Th><Th>Donor</Th><Th>Items</Th><Th>Delivered to</Th><Th>Status</Th></tr></thead>
          <tbody>
            {done.map((d) => (
              <tr key={d.id}>
                <Td className="tabular-nums">{d.date}</Td>
                <Td className="font-medium text-ink">{d.id}</Td>
                <Td>{d.donor}</Td>
                <Td className="tabular-nums">{d.items.map((i) => `${fmt(i.qty)} ${ITEMS[i.item].unit}`).join(", ")}</Td>
                <Td>{d.targetDs}, {d.targetDistrict}</Td>
                <Td><StatusBadge status={d.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {!done.length && <EmptyState text="No deliveries yet." />}
      </Card>
    </>
  );
}
