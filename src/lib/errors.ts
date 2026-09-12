/**
 * An error whose message is safe to show a caller. Everything else — Postgres
 * messages, network failures, bugs — is internal and must be logged rather than
 * serialised into a response.
 */
export class PublicError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    options: { status?: number; code?: string } = {},
  ) {
    super(message);
    this.name = "PublicError";
    this.status = options.status ?? 400;
    this.code = options.code ?? "request_failed";
  }
}
