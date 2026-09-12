import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { NotInstrumented } from "@/components/admin/primitives";

export const metadata: Metadata = {
  title: "Nodes — RentGPU ops",
};

export default function Page() {
  return (
    <AdminShell
      title="Nodes"
      description="Physical hosts behind the marketplace, their GPUs and their telemetry."
    >
      <NotInstrumented
        what="There is no node layer in the schema yet. Capacity is modelled as provider offers — a count of units at a price — with nothing recording which machine a unit lives on, so per-node telemetry, drain and diagnostics have nothing to read or act on. Showing placeholder gauges here would imply monitoring that does not exist."
        needs={[
          "nodes table — provider, hostname, hardware spec, scheduling state",
          "node_gpus table — one row per physical GPU, mapped to its offer",
          "node_telemetry table — utilization, VRAM, temperature, power, ECC, sampled over time",
          "a reporting agent on each host to write those samples",
        ]}
      />
    </AdminShell>
  );
}
