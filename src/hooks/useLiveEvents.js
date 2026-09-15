import { useEffect, useState } from "react";
import { subscribeToLiveStream, getLastSnapshot } from "../liveStream";

/**
 * The latest snapshot pushed by panel-api's shared computation loop (the
 * on-duty roster, live players and the activity feed -- see
 * liveEvents.js on the backend).
 *
 * The connection itself lives in liveStream.js and is shared by every
 * subscriber in the tab, so mounting this alongside the notices provider
 * costs one connection between them rather than one each. The server
 * pushes the whole snapshot every three seconds, so that difference is
 * not academic.
 *
 * Connection loss (a network blip, a backgrounded tab, a server restart)
 * is handled by reconnecting with backoff and is never surfaced as an
 * error: callers are expected to pair this with usePolling at a longer
 * interval as an independent fallback. This is an optimization for
 * latency, never the only path to correct state.
 */
export function useLiveEvents(enabled = true) {
  const [snapshot, setSnapshot] = useState(() => getLastSnapshot());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    return subscribeToLiveStream(event => {
      if (event.type === "snapshot") setSnapshot(event.data);
      else if (event.type === "connected") setConnected(true);
      else if (event.type === "disconnected") setConnected(false);
    });
  }, [enabled]);

  return { snapshot, connected };
}
