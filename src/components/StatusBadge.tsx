import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "running"
      ? "default"
      : status === "terminated"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
