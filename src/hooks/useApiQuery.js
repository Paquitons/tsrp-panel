import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";

/**
 * TanStack Query wrapper around apiFetch, for authenticated-panel data.
 * Fetching still goes through apiFetch (not a bare fetch()) so the
 * existing 401/session-revoked handling in api.js -- clearing the token
 * and dispatching "tsrp:session-invalid" -- keeps working exactly as it
 * does everywhere else; this only adds caching/dedup/refetch scheduling
 * on top, it doesn't change how a request is made or how auth failures
 * are handled.
 *
 * `path` may be null/false to disable the query entirely (e.g. waiting on
 * a route param) -- same convention as passing `enabled: false` in the
 * options, just less boilerplate at call sites that already have the
 * "do I have what I need yet" check as a variable.
 *
 * `select` narrows the raw JSON response down to just the field(s) a
 * component needs (most of this API's responses are `{ someKey: [...] }`
 * wrappers) so re-renders don't happen for a change to a wrapper key an
 * unrelated component isn't reading.
 */
export function useApiQuery(queryKey, path, { refetchInterval, enabled = true, select, ...rest } = {}) {
  return useQuery({
    queryKey,
    queryFn: () => apiFetch(path),
    enabled: enabled && !!path,
    refetchInterval,
    select,
    ...rest,
  });
}

/**
 * TanStack Query wrapper for a write (POST/PATCH/DELETE) through apiFetch.
 * `invalidateKeys` is a list of query keys to mark stale immediately after
 * a successful mutation, so the UI reflects the change on its own next
 * scheduled refetch (or right away, for a query with an active
 * refetchInterval) instead of waiting for the next poll tick to happen to
 * land, or requiring the caller to manually refetch.
 */
export function useApiMutation({ invalidateKeys = [] } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = "POST", body }) => apiFetch(path, { method, body }),
    onSuccess: () => {
      for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
