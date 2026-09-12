import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Dense metric tile for the dashboard grids. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warn" | "bad";
}) {
  return (
    <div className="border border-border bg-surface p-3">
      <p className="num text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p
        className={cn(
          "num mt-1.5 text-xl",
          tone === "warn" && "text-amber-400",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint != null && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

/**
 * Horizontal-scrolling table. Admin tables are wide by nature, so the scroll
 * lives on the table's own container and never on the page body.
 */
export function DataTable({
  columns,
  children,
  empty,
  isEmpty,
}: {
  columns: { key: string; label: string; numeric?: boolean }[];
  children: ReactNode;
  empty?: ReactNode;
  isEmpty?: boolean;
}) {
  if (isEmpty) {
    return (
      <div className="border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {empty ?? "Nothing here yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-background">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "num px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70",
                  c.numeric ? "text-right" : "text-left",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-background/50">
      {children}
    </tr>
  );
}

export function Cell({
  children,
  numeric,
  muted,
  className,
}: {
  children: ReactNode;
  numeric?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2 align-middle",
        numeric && "num text-right",
        muted && "text-muted-foreground",
        className,
      )}
    >
      {children}
    </td>
  );
}

const STATUS_TONE: Record<string, string> = {
  running: "text-emerald-400 border-emerald-400/30",
  active: "text-emerald-400 border-emerald-400/30",
  verified: "text-emerald-400 border-emerald-400/30",
  operational: "text-emerald-400 border-emerald-400/30",
  paid: "text-emerald-400 border-emerald-400/30",
  provisioning: "text-sky-400 border-sky-400/30",
  starting: "text-sky-400 border-sky-400/30",
  pending: "text-amber-400 border-amber-400/30",
  stopping: "text-amber-400 border-amber-400/30",
  degraded: "text-amber-400 border-amber-400/30",
  under_review: "text-amber-400 border-amber-400/30",
  stopped: "text-muted-foreground border-border",
  terminated: "text-muted-foreground border-border",
  failed: "text-destructive border-destructive/40",
  suspended: "text-destructive border-destructive/40",
};

/** Status pill sharing one vocabulary across every console table. */
export function StatusTag({ value }: { value: string }) {
  const tone =
    STATUS_TONE[value.toLowerCase()] ?? "text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "num inline-block border px-1.5 py-0.5 text-[10px] capitalize",
        tone,
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

/** 24H | 7D | 30D | 90D filter shared by the dashboard and finance pages. */
export const RANGES = [
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
] as const;

export type Range = (typeof RANGES)[number]["key"];

export function RangeFilter({
  value,
  onChange,
}: {
  value: Range;
  onChange: (next: Range) => void;
}) {
  return (
    <div className="flex border border-border">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={cn(
            "num border-r border-border px-2.5 py-1 text-[11px] transition-colors last:border-r-0",
            value === r.key
              ? "bg-surface text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Honest placeholder for a page whose backing data does not exist yet.
 * Says what is missing and what would have to ship first, rather than
 * rendering invented numbers.
 */
export function NotInstrumented({
  what,
  needs,
}: {
  what: string;
  needs: string[];
}) {
  return (
    <div className="border border-dashed border-border bg-surface p-8">
      <p className="num text-[10px] uppercase tracking-wider text-amber-400">
        Not instrumented
      </p>
      <p className="mt-2 max-w-xl text-sm text-foreground">{what}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        Ships when these exist:
      </p>
      <ul className="mt-1.5 space-y-1">
        {needs.map((n) => (
          <li key={n} className="num text-xs text-muted-foreground">
            — {n}
          </li>
        ))}
      </ul>
    </div>
  );
}
