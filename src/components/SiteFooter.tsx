import Link from "next/link";
import { Brand } from "./Brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <Brand />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Metered GPU rental. India and Southeast Asia. GST invoices.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-10 gap-y-6 text-sm">
          <ul className="space-y-2">
            <li>
              <Link
                href="/gpus"
                className="text-muted-foreground hover:text-foreground"
              >
                GPU&apos;S
              </Link>
            </li>
            <li>
              <Link
                href="/pricing"
                className="text-muted-foreground hover:text-foreground"
              >
                Pricing
              </Link>
            </li>
            <li>
              <Link
                href="/docs"
                className="text-muted-foreground hover:text-foreground"
              >
                Docs
              </Link>
            </li>
          </ul>
          <ul className="space-y-2">
            <li>
              <Link
                href="/provider"
                className="text-muted-foreground hover:text-foreground"
              >
                List GPUs
              </Link>
            </li>
            <li>
              <Link
                href="/providers"
                className="text-muted-foreground hover:text-foreground"
              >
                Suppliers
              </Link>
            </li>
            <li>
              <Link
                href="/support"
                className="text-muted-foreground hover:text-foreground"
              >
                Support
              </Link>
            </li>
          </ul>
          <p className="text-muted-foreground">
            ChaiMind
            <span className="num mt-1 block text-xs text-muted-foreground/70">
              © {new Date().getFullYear()}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
