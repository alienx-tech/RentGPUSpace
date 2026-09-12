"use client";

import { useSearchParams } from "next/navigation";
import type { z } from "zod";

/** Client-side equivalent of TanStack Router's `validateSearch` — parses with
 * `.catch()`-style defaults, silently stripping unknown keys (zod's default). */
export function useTypedSearchParams<S extends z.ZodTypeAny>(
  schema: S,
): z.infer<S> {
  const params = useSearchParams();
  return schema.parse(Object.fromEntries(params.entries()));
}
