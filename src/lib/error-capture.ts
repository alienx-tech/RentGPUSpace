// Expands Error-like values into a string that keeps the message, stack, and
// full `cause` chain — a plain console.error(error) often loses this detail
// once an error crosses a serialization boundary.
//
// The old TanStack app also used this module to capture errors out-of-band
// for a Nitro/h3-specific bug (h3 swallowing in-handler throws into a
// generic 500 response with no stack). That workaround — and the global
// console.error monkey-patch it required — is intentionally not ported:
// Next's server isn't built on h3, so there's no reason to believe the same
// bug exists, and carrying the workaround forward risks misclassifying a
// real, different error as "the known h3 quirk."

const CAUSE_DEPTH_LIMIT = 5;
const DESCRIPTION_LENGTH_LIMIT = 8_000;

export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(
        typeof current === "string" ? current : safeStringify(current),
      );
      break;
    }
    const label = depth === 0 ? "" : "caused by: ";
    const status = describeStatus(current);
    parts.push(
      `${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`,
    );
    current = current.cause;
  }
  return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

function describeStatus(error: Error): string {
  const { status, statusCode } = error as {
    status?: unknown;
    statusCode?: unknown;
  };
  const value = status ?? statusCode;
  return typeof value === "number" ? ` (status ${value})` : "";
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
