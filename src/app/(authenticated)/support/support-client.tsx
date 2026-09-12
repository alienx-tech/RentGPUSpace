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
import { ticketsQuery } from "@/lib/queries";
import { relTime } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["general", "billing", "instance", "capacity"] as const;

export function SupportClient() {
  const qc = useQueryClient();
  const { data: tickets } = useQuery(ticketsQuery);
  const [subject, setSubject] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("general");
  const [body, setBody] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({ user_id: uid, subject, category })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          user_id: uid,
          body,
          author_role: "customer",
        });
      if (msgError) throw new Error(msgError.message);
      return ticket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      setSubject("");
      setBody("");
      toast.success("Ticket raised. We reply within 4 working hours.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not raise ticket"),
  });

  return (
    <ConsoleShell
      title="Support"
      description="Engineers in IST. No offshore ticket queue."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card kicker="New ticket">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <h2 className="text-base font-semibold">New ticket</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="H100 instance stuck in provisioning"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`border px-2.5 py-1 text-xs capitalize transition-colors ${
                        category === c
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Details</Label>
                <Textarea
                  id="body"
                  required
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What happened, instance name, and what you expected."
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Sending…" : "Raise ticket"}
              </Button>
            </div>
          </form>
        </Card>

        <section>
          <h2 className="text-sm text-muted-foreground">Your tickets</h2>
          <div className="mt-3 stagger grid gap-3">
            {(tickets ?? []).map((t) => (
              <Card
                key={t.id}
                kicker={t.category}
                stamp={relTime(t.created_at)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{t.subject}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {t.category} · {relTime(t.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={t.status === "open" ? "default" : "secondary"}
                  >
                    {t.status}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2 border-t border-hairline pt-3">
                  {(t.ticket_messages ?? []).map((m) => (
                    <p key={m.id} className="text-sm text-muted-foreground">
                      <span className="text-xs text-primary">
                        {m.author_role}
                      </span>{" "}
                      {m.body}
                    </p>
                  ))}
                </div>
              </Card>
            ))}
            {!tickets?.length && (
              <Card>
                <p className="text-center text-sm text-muted-foreground">
                  No tickets yet.
                </p>
              </Card>
            )}
          </div>
        </section>
      </div>
    </ConsoleShell>
  );
}
