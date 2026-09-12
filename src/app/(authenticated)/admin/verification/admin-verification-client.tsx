"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  Cell,
  DataTable,
  Row,
  Stat,
  StatGrid,
  StatusTag,
} from "@/components/admin/primitives";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { providerReviewQueueQuery } from "@/lib/queries";
import { relTime } from "@/lib/format";

const COLUMNS = [
  { key: "provider", label: "Provider" },
  { key: "region", label: "Region" },
  { key: "stages", label: "Stages cleared" },
  { key: "status", label: "Status" },
  { key: "applied", label: "Applied", numeric: true },
  { key: "actions", label: "" },
];

/** Review stages a provider clears before capacity is published. */
const STAGES = ["kyc", "datacentre", "benchmark", "network", "burn_in"];

export function AdminVerificationClient() {
  const { data: providers, isLoading } = useQuery(providerReviewQueueQuery);

  const queue = (providers ?? []).filter(
    (p) => p.verification_status !== "verified",
  );

  return (
    <AdminShell
      title="Provider verification"
      description="Applications waiting on review. A provider's capacity stays off the marketplace until every stage passes."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : (
        <div className="space-y-4">
          <StatGrid>
            <Stat
              label="In queue"
              value={queue.length}
              tone={queue.length ? "warn" : "default"}
            />
            <Stat
              label="Verified"
              value={
                (providers ?? []).filter(
                  (p) => p.verification_status === "verified",
                ).length
              }
            />
            <Stat label="Applications" value={(providers ?? []).length} />
            <Stat label="Stages per provider" value={STAGES.length} />
          </StatGrid>

          <DataTable
            columns={COLUMNS}
            isEmpty={!providers?.length}
            empty="No provider applications yet."
          >
            {(providers ?? []).map((p) => {
              const events = p.provider_verification_events ?? [];
              const passed = new Set(
                events.filter((e) => e.status === "passed").map((e) => e.stage),
              );
              return (
                <Row key={p.id}>
                  <Cell>{p.company_name}</Cell>
                  <Cell muted className="text-xs">
                    {p.region} · {p.country}
                  </Cell>
                  <Cell>
                    <div className="flex flex-wrap gap-1">
                      {STAGES.map((s) => (
                        <span
                          key={s}
                          title={s.replace("_", " ")}
                          className={
                            "num border px-1 py-0.5 text-[10px] " +
                            (passed.has(s)
                              ? "border-emerald-400/30 text-emerald-400"
                              : "border-border text-muted-foreground/50")
                          }
                        >
                          {s.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </Cell>
                  <Cell>
                    <StatusTag value={p.verification_status} />
                  </Cell>
                  <Cell numeric muted>
                    {relTime(p.created_at)}
                  </Cell>
                  <Cell>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/verification">Review</Link>
                    </Button>
                  </Cell>
                </Row>
              );
            })}
          </DataTable>

          <Card kicker="where approvals happen">
            <p className="text-sm text-muted-foreground">
              Stage-by-stage review — KYC, datacentre audit, benchmark, network
              and burn-in — runs on the existing{" "}
              <Link
                href="/verification"
                className="text-foreground underline-offset-4 hover:underline"
              >
                verification page
              </Link>
              . This queue is the ops view of what is waiting there; the two
              read the same rows.
            </p>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
