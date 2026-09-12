export const USD_PER_INR = 1 / 88;

export function inr(paise: number, opts?: { decimals?: number }) {
  const decimals = opts?.decimals ?? 2;
  const value = paise / 100;
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function usd(amount: number, decimals = 2) {
  return `$${amount.toFixed(decimals)}`;
}

/** Per-minute paise -> per-hour rupee string */
export function inrPerHour(paisePerMin: number) {
  return inr(paisePerMin * 60);
}

/** Per-minute paise -> per-hour USD string */
export function usdPerHour(paisePerMin: number) {
  return usd((paisePerMin * 60 * USD_PER_INR) / 100);
}

export function pct(value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

export function relTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function duration(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export const GST_RATE = 0.18;
export const PLATFORM_COMMISSION = 0.18;
