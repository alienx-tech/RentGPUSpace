import { queryOptions } from "@tanstack/react-query";

import {
  adminAuditLog,
  adminBilling,
  adminInstances,
  adminInventory,
  adminMyPermissions,
  adminOverview,
  adminProviders,
  adminUsers,
} from "./admin-console.functions";
import type { RangeKey } from "./admin-console.server";

export const myPermissionsQuery = queryOptions({
  queryKey: ["admin", "permissions"],
  queryFn: () => adminMyPermissions(),
  // Roles change rarely and every page reads this; refetching per navigation
  // would add a round trip to each one.
  staleTime: 60_000,
});

export function overviewQuery(range: RangeKey) {
  return queryOptions({
    queryKey: ["admin", "overview", range],
    queryFn: () => adminOverview({ range }),
    refetchInterval: 60_000,
  });
}

export function adminUsersQuery(search: string) {
  return queryOptions({
    queryKey: ["admin", "users", search],
    queryFn: () => adminUsers({ search }),
  });
}

export const adminInventoryQuery = queryOptions({
  queryKey: ["admin", "inventory"],
  queryFn: () => adminInventory(),
  refetchInterval: 30_000,
});

export function adminInstancesQuery(status: string) {
  return queryOptions({
    queryKey: ["admin", "instances", status],
    queryFn: () => adminInstances({ status }),
    refetchInterval: 20_000,
  });
}

export const adminAuditQuery = queryOptions({
  queryKey: ["admin", "audit"],
  queryFn: () => adminAuditLog(),
});

export const adminProvidersQuery = queryOptions({
  queryKey: ["admin", "providers"],
  queryFn: () => adminProviders(),
});

export function adminBillingQuery(range: RangeKey) {
  return queryOptions({
    queryKey: ["admin", "billing", range],
    queryFn: () => adminBilling({ range }),
  });
}
