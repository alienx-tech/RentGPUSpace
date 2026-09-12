"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { myProvidersQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { submitProviderApplication } from "@/lib/rentgpu.functions";
import { PLATFORM_COMMISSION } from "@/lib/format";

export function ProviderClient() {
  const { session } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: mine } = useQuery({ ...myProvidersQuery, enabled: !!session });

  const [form, setForm] = useState({
    companyName: "",
    region: "ap-south-mumbai",
    country: "IN",
    datacentreTier: "Tier 3",
    networkGbps: 25,
    contactEmail: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => submitProviderApplication(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_providers"] });
      toast.success(
        "Application submitted. Our team will verify within 48 hours.",
      );
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Could not submit application",
      ),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-5 py-14">
        <h1 className="text-2xl md:text-3xl">Become a provider</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          You own the hardware. We bring the demand, meter every minute, collect
          payment, and settle to you weekly. Platform commission is{" "}
          {Math.round(PLATFORM_COMMISSION * 100)}%.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="stagger grid gap-3">
            {[
              {
                k: "01",
                t: "Weekly settlement",
                d: "Payouts every Monday for the previous week's metered minutes, with a line-item statement.",
              },
              {
                k: "02",
                t: "We handle the customer",
                d: "Onboarding, billing disputes, refunds and first-line support are ours, not yours.",
              },
              {
                k: "03",
                t: "Verification",
                d: "We check benchmarks, network throughput, power redundancy and physical security before listing.",
              },
              {
                k: "04",
                t: "Utilisation reporting",
                d: "See booked hours, revenue and idle capacity per GPU model in your console.",
              },
            ].map((c) => (
              <Card key={c.k} kicker={c.k}>
                <h3 className="text-sm">{c.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
              </Card>
            ))}

            {!!mine?.length && (
              <Card kicker="Applications">
                <h3 className="text-sm">Your applications</h3>
                <ul className="mt-3 space-y-2">
                  {mine.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {p.company_name} ·{" "}
                        <span className="text-muted-foreground">
                          {p.region}
                        </span>
                      </span>
                      <Badge
                        variant={
                          p.verification_status === "verified"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {p.verification_status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <Card kicker="Apply">
            <h2 className="text-base">Apply to list capacity</h2>
            {!session ? (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Sign in to submit an application.
                </p>
                <Button
                  className="mt-4"
                  onClick={() =>
                    router.push("/auth?mode=signup&redirect=%2Fprovider")
                  }
                >
                  Sign in to continue
                </Button>
              </div>
            ) : (
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                <Field label="Company name">
                  <Input
                    required
                    value={form.companyName}
                    onChange={(e) =>
                      setForm({ ...form, companyName: e.target.value })
                    }
                    placeholder="Nimbus Datacentres Pvt Ltd"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Region">
                    <Input
                      required
                      value={form.region}
                      onChange={(e) =>
                        setForm({ ...form, region: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Country code">
                    <Input
                      required
                      maxLength={2}
                      value={form.country}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          country: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Data-centre tier">
                    <Input
                      required
                      value={form.datacentreTier}
                      onChange={(e) =>
                        setForm({ ...form, datacentreTier: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Network (Gbps)">
                    <Input
                      required
                      type="number"
                      min={1}
                      max={400}
                      value={form.networkGbps}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          networkGbps: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="Contact email">
                  <Input
                    required
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) =>
                      setForm({ ...form, contactEmail: e.target.value })
                    }
                  />
                </Field>
                <Field label="Fleet details">
                  <Textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="8× H100 SXM, 4× A100 80GB, redundant power, 1 Gbps uplink…"
                  />
                </Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Submitting…" : "Submit application"}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
