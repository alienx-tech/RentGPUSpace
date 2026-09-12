"use client";

// Catches errors thrown by the root layout itself, which error.tsx cannot
// (error.tsx wraps everything below the root layout, not the layout itself).
// Must define its own <html>/<body> — it replaces the root layout when active,
// so it does not inherit globals.css or the dark class set there.

export default function GlobalError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{ maxWidth: "28rem", textAlign: "center", padding: "2rem" }}
        >
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              margin: "0 0 0.5rem",
            }}
          >
            This page didn&apos;t load
          </h1>
          <p
            style={{
              color: "#a1a1aa",
              margin: "0 0 1.5rem",
              fontSize: "0.875rem",
            }}
          >
            Something went wrong on our end. You can try again or head back
            home.
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => retry()}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                font: "inherit",
                cursor: "pointer",
                border: "1px solid transparent",
                background: "#fafafa",
                color: "#0a0a0a",
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error replaces the whole root layout (router included), so a plain reload is the only reliable way home here. */}
            <a
              href="/"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                font: "inherit",
                textDecoration: "none",
                background: "transparent",
                color: "#fafafa",
                border: "1px solid #3f3f46",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
