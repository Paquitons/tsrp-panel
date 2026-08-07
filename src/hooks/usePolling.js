import { useEffect, useRef } from "react";

/**
 * Runs `fn` immediately, then every `intervalMs` for as long as the
 * component is mounted -- the shared pattern behind every "live" section
 * of the site (see Dashboard.jsx/Home.jsx, which predate this hook and
 * inline the same three lines). `fn` is expected to catch its own
 * errors, same as those -- a failed poll just keeps showing the last
 * known good value and tries again next tick, it never throws into here.
 *
 * `intervalMs` can change across renders (e.g. a user-configurable
 * refresh rate) and the interval restarts cleanly; pass `null` to pause
 * polling entirely without unmounting whatever renders the fetched data.
 *
 * `deps` restarts the interval AND fires an immediate fetch when any of
 * them change -- for a page like StockDetail.jsx, where `fn` closes over
 * a route param, this is what makes navigating from one ticker to
 * another fetch right away instead of showing the previous stock's data
 * until the next tick happens to land.
 */
export function usePolling(fn, intervalMs, deps = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!intervalMs) return;
    let cancelled = false;
    const tick = () => {
      if (!cancelled) Promise.resolve(fnRef.current()).catch(() => {});
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
