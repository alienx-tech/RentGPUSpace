/** Only ever redirect to a same-origin path — blocks protocol-relative (`//evil.com`) open redirects. */
export function safePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}
