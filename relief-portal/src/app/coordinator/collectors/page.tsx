"use client";

import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { COLLECTORS } from "@/lib/data";

export default function Collectors() {
  return (
    <>
      <PageHeader title="Collectors" subtitle="Collection teams from partner organisations in each district." />
      <Card>
        <Table>
          <thead><tr><Th>Collector</Th><Th>Organisation</Th><Th>District</Th><Th>Phone</Th><Th>Vehicle</Th><Th className="text-right">Active jobs</Th><Th>Status</Th></tr></thead>
          <tbody>
            {COLLECTORS.map((c) => (
              <tr key={c.name}>
                <Td className="font-medium text-ink">{c.name}</Td>
                <Td>{c.org}</Td>
                <Td>{c.district}</Td>
                <Td className="tabular-nums">{c.phone}</Td>
                <Td>{c.vehicle}</Td>
                <Td className="text-right tabular-nums">{c.active}</Td>
                <Td><Badge tone={c.status === "Available" ? "green" : c.status === "On route" ? "blue" : "gray"}>{c.status}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
