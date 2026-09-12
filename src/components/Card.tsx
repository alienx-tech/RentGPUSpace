import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  kicker?: ReactNode;
  stamp?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  id?: string;
  children: ReactNode;
};

/** Spec-plate card — header rule, body, optional footer. Not a rounded SaaS tile. */
export function Card({
  kicker,
  stamp,
  footer,
  padded = true,
  className,
  id,
  children,
}: CardProps) {
  return (
    <article
      id={id}
      className={cn(
        "plate flex flex-col border border-border bg-surface",
        className,
      )}
    >
      {(kicker != null || stamp != null) && (
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-3 py-1.5">
          <span className="num min-w-0 truncate text-[10px] text-muted-foreground">
            {kicker}
          </span>
          {stamp != null ? (
            <span className="num shrink-0 text-[10px] text-foreground">
              {stamp}
            </span>
          ) : null}
        </header>
      )}
      <div className={cn("flex flex-1 flex-col", padded && "p-4")}>
        {children}
      </div>
      {footer != null ? (
        <footer className="mt-auto border-t border-border px-4 py-3">
          {footer}
        </footer>
      ) : null}
    </article>
  );
}
