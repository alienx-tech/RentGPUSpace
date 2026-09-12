"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { myRolesQuery, providerReviewQueueQuery } from "@/lib/queries";
import {
  decideProviderApplication,
  reviewProviderStage,
} from "@/lib/rentgpu.functions";

const STAGES = [
  { key: "kyc", label: "Company KYC" },
  { key: "datacentre", label: "Datacentre audit" },
  { key: "benchmark", label: "Hardware benchmark" },
  { key: "network", label: "Network + storage test" },
  { key: "burn_in", label: "Live burn-in" },
];

export function VerificationClient() {
  const qc = useQueryClient();
  const { data: roles } = useQuery(myRolesQuery);
  const isAdmin = (roles ?? []).includes("admin");
  const { data: providers } = useQuery({
    ...providerReviewQueueQuery,
    enabled: isAdmin,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [scorecard, setScorecard] = useState({
    benchmarkScore: 900,
    uptimePct: 99.9,
    storageReadMbps: 6000,
    storageWriteMbps: 4200,
    avgProvisionSeconds: 55,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["provider_review_queue"] });
    void qc.invalidateQueries({ queryKey: ["public_providers"] });
  };

  const stageMutation = useMutation({
    mutationFn: (v: {
      providerId: string;
      stage: string;
      status: "passed" | "failed" | "pending";
    }) => reviewProviderStage({ ...v, notes }),
    onSuccess: () => {
      invalidate();
      setNotes("");
      toast.success("Stage recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decisionMutation = useMutation({
    mutationFn: (v: {
      providerId: string;
      decision: "verified" | "rejected" | "suspended";
    }) =>
      decideProviderApplication({
        ...v,
        notes,
        scorecard: v.decision === "verified" ? scorecard : undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Decision saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <ConsoleShell
        title="Provider verification"
        description="Restricted area."
      >
        <Card>
          <p className="text-sm text-muted-foreground">
            This queue is only available to RentGPU platform admins.
          </p>
        </Card>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell
      title="Provider verification"
      description="Work each supplier through KYC, datacentre audit, benchmark, network/storage test and burn-in, then publish a scorecard."
    >
      <div className="stagger space-y-4">
        {(providers ?? []).map((p) => {
          const open = selected === p.id;
          const events = p.provider_verification_events ?? [];
          return (
            <Card key={p.id} kicker={p.region} stamp={p.verification_status}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{p.company_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {p.region} · {p.datacentre_tier} · {p.network_gbps} Gbps ·{" "}
                    {p.contact_email ?? "no contact"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      p.verification_status === "verified"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {p.verification_status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(open ? null : p.id)}
                  >
                    {open ? "Close" : "Review"}
                  </Button>
                </div>
              </div>

              {!!events.length && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {events.map((e) => (
                    <Badge
                      key={e.id}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {e.stage}: {e.status}
                    </Badge>
                  ))}
                </ul>
              )}

              {open && (
                <div className="mt-5 space-y-4 border-t border-hairline pt-4">
                  <div>
                    <Label className="text-xs">Reviewer notes</Label>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={notes}
                      maxLength={500}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What was checked and what was found…"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {STAGES.map((s) => (
                      <div
                        key={s.key}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1"
                      >
                        <span className="text-xs">{s.label}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px]"
                          disabled={stageMutation.isPending}
                          onClick={() =>
                            stageMutation.mutate({
                              providerId: p.id,
                              stage: s.key,
                              status: "passed",
                            })
                          }
                        >
                          pass
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11px] text-destructive"
                          disabled={stageMutation.isPending}
                          onClick={() =>
                            stageMutation.mutate({
                              providerId: p.id,
                              stage: s.key,
                              status: "failed",
                            })
                          }
                        >
                          fail
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <NumField
                      label="Benchmark score"
                      value={scorecard.benchmarkScore}
                      onChange={(v) =>
                        setScorecard({ ...scorecard, benchmarkScore: v })
                      }
                    />
                    <NumField
                      label="Uptime %"
                      step={0.01}
                      value={scorecard.uptimePct}
                      onChange={(v) =>
                        setScorecard({ ...scorecard, uptimePct: v })
                      }
                    />
                    <NumField
                      label="Provision seconds"
                      value={scorecard.avgProvisionSeconds}
                      onChange={(v) =>
                        setScorecard({ ...scorecard, avgProvisionSeconds: v })
                      }
                    />
                    <NumField
                      label="NVMe read MB/s"
                      value={scorecard.storageReadMbps}
                      onChange={(v) =>
                        setScorecard({ ...scorecard, storageReadMbps: v })
                      }
                    />
                    <NumField
                      label="NVMe write MB/s"
                      value={scorecard.storageWriteMbps}
                      onChange={(v) =>
                        setScorecard({ ...scorecard, storageWriteMbps: v })
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={decisionMutation.isPending}
                      onClick={() =>
                        decisionMutation.mutate({
                          providerId: p.id,
                          decision: "verified",
                        })
                      }
                    >
                      Approve & publish scorecard
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decisionMutation.isPending}
                      onClick={() =>
                        decisionMutation.mutate({
                          providerId: p.id,
                          decision: "suspended",
                        })
                      }
                    >
                      Suspend
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={decisionMutation.isPending}
                      onClick={() =>
                        decisionMutation.mutate({
                          providerId: p.id,
                          decision: "rejected",
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {!providers?.length && (
          <Card>
            <p className="text-sm text-muted-foreground">
              No provider applications yet.
            </p>
          </Card>
        )}
      </div>
    </ConsoleShell>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="mt-1.5"
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
