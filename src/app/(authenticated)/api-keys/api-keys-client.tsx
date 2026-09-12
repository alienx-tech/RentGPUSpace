"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { createApiKey, revokeApiKey } from "@/lib/api-keys.functions";
import { relTime } from "@/lib/format";

export function ApiKeysClient() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ["api_keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id,name,prefix,created_at,last_used_at,revoked_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: (label: string) => createApiKey({ name: label }),
    onSuccess: (res) => {
      setFreshKey(res.secret);
      setName("");
      void qc.invalidateQueries({ queryKey: ["api_keys"] });
      toast.success("API key created — copy it now, it is shown once.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeApiKey({ id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["api_keys"] });
      toast.success("Key revoked.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ConsoleShell
      title="API keys"
      description="Rent, start, stop and meter GPUs programmatically from your own systems."
    >
      <div className="space-y-6">
        <Card kicker="Create">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4 text-primary" /> Create a key
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Keys carry your account&apos;s full provisioning and billing
            permissions. Store them as a secret.
          </p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length >= 2) createMut.mutate(name.trim());
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CI pipeline"
              className="sm:max-w-xs"
            />
            <Button
              type="submit"
              disabled={createMut.isPending || name.trim().length < 2}
            >
              {createMut.isPending ? "Creating…" : "Create key"}
            </Button>
          </form>

          {freshKey ? (
            <div className="mt-4 rounded-md border border-primary/40 bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">
                Copy this now — it will not be shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="num flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 text-xs">
                  {freshKey}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(freshKey);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card kicker="Keys" padded={false}>
          <div className="border-b border-border px-5 py-3 text-sm font-medium">
            Your keys
          </div>
          {keys.data && keys.data.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border/70">
                  <th className="px-5 py-2 text-left font-normal">Name</th>
                  <th className="px-5 py-2 text-left font-normal">Prefix</th>
                  <th className="px-5 py-2 text-left font-normal">Last used</th>
                  <th className="px-5 py-2 text-left font-normal">Status</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {keys.data.map((k) => (
                  <tr
                    key={k.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-5 py-3">{k.name}</td>
                    <td className="num px-5 py-3 text-muted-foreground">
                      {k.prefix}…
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {relTime(k.last_used_at)}
                    </td>
                    <td className="px-5 py-3">
                      {k.revoked_at ? (
                        <span className="text-muted-foreground">Revoked</span>
                      ) : (
                        <span className="text-primary">Active</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!k.revoked_at ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => revokeMut.mutate(k.id)}
                          title="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No keys yet. Create one to start calling the API.
            </p>
          )}
        </Card>

        <Card kicker="Example">
          <div className="font-medium">Quick call</div>
          <pre className="num mt-3 overflow-x-auto rounded bg-background p-3 text-xs text-muted-foreground">{`curl -X POST https://rentgpu.space/api/public/v1/instances \\
  -H "Authorization: Bearer rgpu_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"offer_id":"<uuid>","name":"train-run-1","storage_gb":100,"spend_cap_paise":500000}'`}</pre>
          <p className="mt-3 text-muted-foreground">
            Full endpoint reference lives in the docs.
          </p>
        </Card>
      </div>
    </ConsoleShell>
  );
}
