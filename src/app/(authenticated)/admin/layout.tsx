import type { Metadata } from "next";

// Layout for every console page. The pages render AdminShell themselves so
// each can supply its own title and header actions; this route exists to give
// them a shared /admin prefix and to keep them out of the customer shell.
export const metadata: Metadata = {
  robots: { index: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
