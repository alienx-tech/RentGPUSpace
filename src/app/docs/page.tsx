import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title: "Docs — deploy a GPU in three steps | RentGPU.space",
  description:
    "How RentGPU billing, templates, SSH access and auto-shutdown work. Quickstart for deploying your first GPU instance.",
  openGraph: {
    title: "RentGPU docs — quickstart and billing",
    description: "Deploy, connect and control spend on RentGPU.",
  },
};

const sections = [
  {
    h: "1. Fund your wallet",
    p: "Every account starts with ₹500 of free credit. Top up over UPI, card or net banking from the wallet page. Compute is deducted every minute an instance runs; there is no monthly commitment.",
  },
  {
    h: "2. Pick a GPU and template",
    p: "Choose an offer from the GPU list by model, region and price, then attach a template — PyTorch, vLLM, ComfyUI, Ollama or a bare CUDA image. Storage is provisioned as NVMe on the same host.",
  },
  {
    h: "3. Connect",
    p: "Each running instance exposes an SSH endpoint and, for Jupyter-enabled templates, a notebook token. Both appear on the instance page the moment the box reaches running state.",
  },
  {
    h: "Billing model",
    p: "Rates are quoted per minute in paise for precision. A stopped instance stops compute billing immediately; attached storage keeps accruing until you terminate. Invoices are issued monthly with 18% GST.",
  },
  {
    h: "Spend controls",
    p: "Set a per-instance spend cap and an auto-shutdown timer at deploy time. When either is hit — or your wallet balance runs dry — RentGPU stops the instance and records the reason in the event log.",
  },
  {
    h: "Providers",
    p: "Capacity comes from verified data-centre partners. Providers keep 82% of the metered revenue; RentGPU retains 18% for orchestration, billing, support and settlement.",
  },
];

const apiEndpoints = [
  {
    method: "GET",
    path: "/api/public/v1/gpus",
    what: "List live offers and prices",
  },
  { method: "GET", path: "/api/public/v1/instances", what: "Your instances" },
  {
    method: "POST",
    path: "/api/public/v1/instances",
    what: "Rent and boot a GPU",
  },
  {
    method: "GET",
    path: "/api/public/v1/instances/{id}",
    what: "Detail + event log",
  },
  {
    method: "POST",
    path: "/api/public/v1/instances/{id}/start",
    what: "Resume a stopped box",
  },
  {
    method: "POST",
    path: "/api/public/v1/instances/{id}/stop",
    what: "Stop and settle",
  },
  {
    method: "DELETE",
    path: "/api/public/v1/instances/{id}",
    what: "Terminate for good",
  },
  {
    method: "GET",
    path: "/api/public/v1/usage",
    what: "Balance, burn rate, runway",
  },
  {
    method: "POST",
    path: "/api/public/v1/usage",
    what: "Force a metering tick",
  },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-14">
        <h1 className="text-2xl md:text-3xl">Docs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          From sign-up to a running job.
        </p>

        <div className="mt-10 stagger grid gap-3">
          {sections.map((s, i) => (
            <Card key={s.h} kicker={`0${i + 1}`}>
              <h2 className="text-base">{s.h.replace(/^\d+\.\s/, "")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.p}
              </p>
            </Card>
          ))}
        </div>

        <Card kicker="SSH" className="mt-8">
          <h2 className="text-base">Connect over SSH</h2>
          <pre className="num mt-3 overflow-x-auto bg-background p-3 text-xs text-muted-foreground">
            {`ssh -p 22001 root@mum1.rentgpu.space
nvidia-smi
python train.py --epochs 3`}
          </pre>
        </Card>

        <Card kicker="API" className="mt-8" id="api">
          <h2 className="text-base">Public API</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Rent, start, stop and meter GPUs from your own systems. Create a key
            in the console under API keys and send it as{" "}
            <code className="num">Authorization: Bearer rgpu_live_…</code>.
            Every mutation is billed and audited exactly like the dashboard;
            keys are stored hashed and can be revoked at any time.
          </p>

          <div className="mt-5 space-y-2 text-sm">
            {apiEndpoints.map((e) => (
              <div
                key={`${e.method} ${e.path}`}
                className="flex flex-col gap-1 border-b border-hairline py-2 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="num w-16 shrink-0 text-xs font-semibold text-primary">
                  {e.method}
                </span>
                <code className="num text-xs">{e.path}</code>
                <span className="text-xs text-muted-foreground sm:ml-auto">
                  {e.what}
                </span>
              </div>
            ))}
          </div>

          <pre className="num mt-5 overflow-x-auto border border-border bg-surface p-4 text-xs text-muted-foreground">
            {`# 1. find capacity (no auth needed)
curl https://rentgpu.space/api/public/v1/gpus

# 2. rent a GPU with a ₹5,000 spend cap and 2h auto-shutdown
curl -X POST https://rentgpu.space/api/public/v1/instances \\
  -H "Authorization: Bearer $RENTGPU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"offer_id":"<uuid>","name":"train-run-1","storage_gb":100,
       "spend_cap_paise":500000,"auto_shutdown_minutes":120}'

# 3. stop / start / terminate
curl -X POST https://rentgpu.space/api/public/v1/instances/<id>/stop \\
  -H "Authorization: Bearer $RENTGPU_API_KEY"

# 4. meter now and read the billing snapshot
curl -X POST https://rentgpu.space/api/public/v1/usage -H "Authorization: Bearer $RENTGPU_API_KEY"
curl https://rentgpu.space/api/public/v1/usage -H "Authorization: Bearer $RENTGPU_API_KEY"`}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            All amounts are integer paise. Errors return JSON with an{" "}
            <code className="num">error</code> code and a human-readable{" "}
            <code className="num">message</code>; unauthenticated calls return
            401.
          </p>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
