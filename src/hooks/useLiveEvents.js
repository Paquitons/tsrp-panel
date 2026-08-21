import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../api";

/**
 * Subscribes to GET /events/stream (panel-api's shared push loop for the
 * on-duty roster, live players, and activity feed -- see liveEvents.js on
 * the backend) and returns the latest pushed snapshot.
 *
 * Deliberately NOT the browser's native EventSource: EventSource has no
 * way to attach a custom Authorization header, and the only workaround is
 * putting the session token in the URL as a query param -- exactly the
 * anti-pattern this whole rewrite is elsewhere removing (it leaks into
 * server access logs, browser history, and Referer headers). This instead
 * reads the same "data: ...\n\n" SSE wire format by hand over a normal
 * fetch() with a real Authorization header, using ReadableStream +
 * TextDecoder to parse frames as they arrive.
 *
 * Connection loss (network blip, tab backgrounded, server restart) is
 * handled by reconnecting with a short backoff -- never surfaced as an
 * error to the caller, since `enabled` callers are expected to pair this
 * with usePolling at a longer interval as an independent fallback. This
 * hook is an optimization for latency, never the only path to correct
 * state.
 */
const INITIAL_RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export function useLiveEvents(enabled = true) {
  const [snapshot, setSnapshot] = useState(null);
  const [connected, setConnected] = useState(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    let cancelled = false;
    let reconnectTimer = null;
    let abortController = null;
    let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;

    async function connectOnce() {
      const token = localStorage.getItem("tsrp_token");
      if (!token) return;

      abortController = new AbortController();
      try {
        const res = await fetch(`${API_BASE}/events/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });

        // A 401 is not a network problem and must not be retried. The
        // backend has decided this session is no longer valid (expired,
        // or actively revoked because the user was terminated, demoted or
        // blacklisted). Retrying it on the 3s reconnect timer meant a
        // revoked tab hammered /events/stream twenty times a minute
        // forever -- burning the shared rate limit for everyone else on
        // that IP -- while never telling the user anything, because this
        // hook swallowed the failure instead of raising it. Routing it
        // through the same session-invalid event every other API call
        // uses (see api.js) logs the tab out, exactly as a 401 on any
        // ordinary request already does.
        if (res.status === 401) {
          localStorage.removeItem("tsrp_token");
          window.dispatchEvent(new CustomEvent("tsrp:session-invalid", {
            detail: { message: "Your session has ended. Please log in again." },
          }));
          return; // deliberately no reconnect
        }

        if (!res.ok || !res.body) throw new Error(`Live event stream failed with status ${res.status}`);

        setConnected(true);
        reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS; // a good connection clears any accumulated backoff
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line; each frame here is
          // a "data: {...}" line, an "event: unauthorized" frame, or a
          // ": heartbeat" comment line.
          let frameEnd;
          while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, frameEnd);
            buffer = buffer.slice(frameEnd + 2);

            // The backend re-checks the session periodically on an
            // already-open stream and sends this before closing, so a
            // session revoked mid-stream logs the tab out immediately
            // instead of looking like an ordinary disconnect (which
            // would just reconnect, get a 401, and land above anyway --
            // this is simply the direct path). See routes/events.js.
            if (frame.startsWith("event: unauthorized")) {
              localStorage.removeItem("tsrp_token");
              window.dispatchEvent(new CustomEvent("tsrp:session-invalid", {
                detail: { message: "Your session has been revoked. Please log in again." },
              }));
              cancelled = true;
              return;
            }

            if (!frame.startsWith("data:")) continue; // heartbeat comment or blank -- nothing to parse
            try {
              setSnapshot(JSON.parse(frame.slice(5).trim()));
            } catch { /* malformed frame -- skip it, keep the connection open */ }
          }
        }
      } catch {
        // Network error, abort (on cleanup), or non-OK response -- all
        // handled the same way: fall through to the reconnect below.
      } finally {
        setConnected(false);
      }

      if (!cancelled) {
        // Backoff, not a fixed 3s. A backend that is down (restarting,
        // deploying) would otherwise be hit by every open tab every 3
        // seconds for as long as the outage lasts -- which is exactly
        // when it can least afford the load, and is enough on its own to
        // trip the API's rate limiter and slow its recovery. Capped so a
        // long outage still reconnects promptly once it ends.
        reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
        reconnectTimer = setTimeout(connectOnce, reconnectDelayMs);
      }
    }

    connectOnce();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (abortController) abortController.abort();
    };
  }, [enabled]);

  return { snapshot, connected };
}
