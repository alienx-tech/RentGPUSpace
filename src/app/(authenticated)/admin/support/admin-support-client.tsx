"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AdminShell, IfPermitted } from "@/components/admin/AdminShell";
import { Stat, StatGrid, StatusTag } from "@/components/admin/primitives";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminReplyTicket,
  adminSetTicketStatus,
  adminSupportQueue,
} from "@/lib/admin.functions";
import { TICKET_STATUSES } from "@/lib/support";
import { relTime } from "@/lib/format";

const supportQueueQuery = queryOptions({
  queryKey: ["admin_support_queue"],
  queryFn: () => adminSupportQueue(),
});

export function AdminSupportClient() {
  const qc = useQueryClient();
  const { data: tickets, isLoading } = useQuery(supportQueueQuery);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin_support_queue"] });

  const replyMutation = useMutation({
    mutationFn: (v: { ticketId: string; body: string }) => adminReplyTicket(v),
    onSuccess: () => {
      void invalidate();
      setReply("");
      toast.success("Reply sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: (v: {
      ticketId: string;
      status: (typeof TICKET_STATUSES)[number];
    }) => adminSetTicketStatus(v),
    onSuccess: () => {
      void invalidate();
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = (tickets ?? []).filter((t) => t.status === "open");
  const urgent = (tickets ?? []).filter(
    (t) => t.priority === "critical" || t.priority === "high",
  );

  return (
    <AdminShell
      title="Support queue"
      description="Every ticket across tenants, newest activity first."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : !tickets?.length ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            No support tickets yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <StatGrid>
            <Stat
              label="Open"
              value={open.length}
              tone={open.length ? "warn" : "default"}
            />
            <Stat
              label="High / critical"
              value={urgent.length}
              tone={urgent.length ? "bad" : "default"}
            />
            <Stat label="All tickets" value={tickets.length} />
            <Stat
              label="Awaiting reply"
              value={
                tickets.filter(
                  (t) => t.messages.at(-1)?.author_role === "customer",
                ).length
              }
            />
          </StatGrid>

          <div className="space-y-3">
            {tickets.map((t) => {
              const expanded = openId === t.id;
              return (
                <Card
                  key={t.id}
                  kicker={`${t.category} · ${t.priority}`}
                  stamp={relTime(t.updated_at)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold">{t.subject}</h2>
                      <p className="num truncate text-[11px] text-muted-foreground">
                        {t.customer.email}
                        {t.customer.orgName
                          ? ` · ${t.customer.orgName}`
                          : ""} · {t.messages.length} message
                        {t.messages.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusTag value={t.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOpenId(expanded ? null : t.id)}
                      >
                        {expanded ? "Close" : "Open"}
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-5 space-y-4 border-t border-hairline pt-4">
                      <ul className="space-y-3">
                        {t.messages.map((m) => (
                          <li
                            key={m.id}
                            className="border-l-2 border-border pl-3"
                          >
                            <p className="num text-[10px] uppercase tracking-wider text-muted-foreground">
                              {m.author_role} · {relTime(m.created_at)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {m.body}
                            </p>
                          </li>
                        ))}
                        {!t.messages.length && (
                          <li className="text-sm text-muted-foreground">
                            No messages on this ticket.
                          </li>
                        )}
                      </ul>

                      <IfPermitted
                        permission="support.write"
                        fallback={
                          <p className="text-xs text-muted-foreground">
                            You have read access to the queue but cannot reply.
                          </p>
                        }
                      >
                        <div>
                          <Label className="text-xs">Staff reply</Label>
                          <Textarea
                            className="mt-2"
                            rows={3}
                            maxLength={4000}
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Reply to the customer…"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            disabled={
                              replyMutation.isPending || reply.trim().length < 2
                            }
                            onClick={() =>
                              replyMutation.mutate({
                                ticketId: t.id,
                                body: reply.trim(),
                              })
                            }
                          >
                            Send reply
                          </Button>
                          <span className="mx-1 text-xs text-muted-foreground">
                            Set status:
                          </span>
                          {TICKET_STATUSES.filter((s) => s !== t.status).map(
                            (s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant="outline"
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  statusMutation.mutate({
                                    ticketId: t.id,
                                    status: s,
                                  })
                                }
                              >
                                {s}
                              </Button>
                            ),
                          )}
                        </div>
                      </IfPermitted>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
