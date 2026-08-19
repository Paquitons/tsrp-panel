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

    async function connectOnce() {
      const token = localStorage.getItem("tsrp_token");
      if (!token) return;

      abortController = new AbortController();
      try {
        const res = await fetch(`${API_BASE}/events/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });
        if (!res.ok || !res.body) throw new Error(`Live event stream failed with status ${res.status}`);

        setConnected(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line; each frame here is
          // either a "data: {...}" line or a ": heartbeat" comment line.
          let frameEnd;
          while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, frameEnd);
            buffer = buffer.slice(frameEnd + 2);
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
        reconnectTimer = setTimeout(connectOnce, 3_000);
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
