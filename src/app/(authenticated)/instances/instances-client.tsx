"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ConsoleShell } from "@/components/ConsoleShell";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { instancesQuery } from "@/lib/queries";
import { inr, inrPerHour, relTime } from "@/lib/format";

export function InstancesClient() {
  const { data: instances } = useQuery(instancesQuery);

  return (
    <ConsoleShell
      title="Instances"
      description="Every box you've deployed, live and historical."
    >
      <Card kicker="Fleet" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">GPU</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 text-right font-medium">Rate</th>
                <th className="px-4 py-3 text-right font-medium">Spent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(instances ?? []).map((i) => (
                <tr
                  key={i.id}
                  className="border-t border-hairline hover:bg-secondary/30"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {relTime(i.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {i.provider_offers?.gpu_types?.model}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {i.provider_offers?.providers?.region}
                  </td>
                  <td className="num px-4 py-3 text-right">
                    {inrPerHour(i.price_inr_per_min_paise)}/hr
                  </td>
                  <td className="num px-4 py-3 text-right">
                    {inr(i.accrued_paise)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/instances/${i.id}`}>Manage</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!instances?.length && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing deployed yet.{" "}
              <Link href="/gpus" className="text-primary hover:underline">
                Browse GPU’S
              </Link>
            </p>
          )}
        </div>
      </Card>
    </ConsoleShell>
  );
}
