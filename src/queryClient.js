import { QueryClient } from "@tanstack/react-query";

/**
 * This is a live ops panel (shift status, player counts, pending
 * approvals) -- staleTime 0 means every query is considered stale the
 * instant it lands, so a component that mounts and finds a cached value
 * from a moment ago still triggers a background refetch rather than
 * silently trusting it. Each query still controls its OWN actual refetch
 * cadence via refetchInterval (see useApiQuery below), matching whatever
 * polling interval that page used before -- this only governs whether a
 * *newly mounted* consumer of an already-cached key gets a fresh fetch.
 *
 * retry: 1 (not the default 3) -- a failed request here should surface
 * quickly so the page's own error state shows, not silently retry for
 * several seconds first while staff wait on what looks like a hang.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
