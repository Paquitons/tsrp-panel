import Banner from "./Banner";

/**
 * One loading/error/empty renderer, driven directly off a TanStack Query
 * result object ({ isLoading, isError, error, data, ... } -- pass the
 * whole thing as `query`, or the individual flags if you're composing
 * more than one query). Replaces the 4+ different loading conventions and
 * 5+ different error conventions that had accumulated across pages
 * (some plain "Loading…" text, some none at all; some `error && <div
 * className="error-banner">`, some alert()s, some silent).
 *
 * `isEmpty` is a caller-supplied predicate over the data (e.g. `d =>
 * d.length === 0`) -- optional, since "empty" only means something for
 * list-shaped data, not every page.
 */
export default function AsyncBoundary({
  query,
  isLoading = query?.isLoading,
  isError = query?.isError,
  error = query?.error,
  data = query?.data,
  isEmpty,
  emptyMessage = "Nothing here yet.",
  loadingMessage = "Loading…",
  children,
}) {
  if (isLoading) return <p className="muted">{loadingMessage}</p>;
  if (isError) return <Banner>{error?.message || "Something went wrong."}</Banner>;
  if (isEmpty?.(data)) return <p className="muted">{emptyMessage}</p>;
  return typeof children === "function" ? children(data) : children;
}
