// ============================================================
//  LIVE STREAM -- one connection to GET /events/stream per tab, shared.
//
//  This used to live inside useLiveEvents, which meant the connection
//  belonged to whichever component mounted the hook. That was fine while
//  the Dashboard was the only subscriber. It stopped being fine when
//  notices arrived: those have to reach a staff member on any page, so a
//  second subscriber would have meant a second connection, and the server
//  pushes the full snapshot (on-duty roster, every live player, a hundred
//  activity events) every three seconds down each one.
//
//  So the connection is a module singleton with reference-counted
//  subscribers: the first subscriber opens it, the last one to leave
//  closes it, and everybody in between is fanned out to from the same
//  frames. useLiveEvents is now a thin wrapper over this and behaves
//  exactly as it did.
//
//  Deliberately NOT the browser's EventSource: EventSource cannot send an
//  Authorization header, and the only workaround is putting the session
//  token in the URL, where it lands in access logs, history and Referer
//  headers. This reads the SSE wire format by hand over fetch().
// ============================================================
import { API_BASE } from "./api";

const INITIAL_RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

const subscribers = new Set();

let abortController = null;
let reconnectTimer = null;
let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
let running = false;
let lastSnapshot = null;

function emit(event) {
  // One bad subscriber must not stop the others hearing this: the same
  // reason the server guards its own listener loop.
  for (const handler of [...subscribers]) {
    try {
      handler(event);
    } catch (err) {
      console.error("[LIVE STREAM] A subscriber threw:", err);
    }
  }
}

function endSession(message) {
  localStorage.removeItem("tsrp_token");
  window.dispatchEvent(new CustomEvent("tsrp:session-invalid", { detail: { message } }));
}

/**
 * One frame off the wire. Frames are either "data: {...}" (the shared
 * snapshot), or a named "event: x\ndata: {...}" pair, or a ":" comment
 * heartbeat.
 */
function handleFrame(frame) {
  const named = /^event: (\S+)/m.exec(frame);
  const dataLine = /^data: (.*)$/m.exec(frame);

  if (named?.[1] === "unauthorized") {
    endSession("Your session has been revoked. Please log in again.");
    return { stop: true };
  }

  if (!dataLine) return {}; // heartbeat comment, or a frame with no payload

  let payload;
  try {
    payload = JSON.parse(dataLine[1]);
  } catch {
    return {}; // malformed frame -- skip it, keep the connection
  }

  if (!named) {
    lastSnapshot = payload;
    emit({ type: "snapshot", data: payload });
    return {};
  }

  emit({ type: named[1], data: payload });
  return {};
}

async function connectOnce() {
  const token = localStorage.getItem("tsrp_token");
  if (!token || !running) return;

  abortController = new AbortController();
  try {
    const res = await fetch(`${API_BASE}/events/stream`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortController.signal,
    });

    // A 401 is not a network problem and must never be retried: the
    // backend has decided this session is finished. Retrying on the
    // reconnect timer meant a revoked tab hammered the endpoint forever,
    // burning the shared rate limit, while telling the user nothing.
    if (res.status === 401) {
      endSession("Your session has ended. Please log in again.");
      running = false;
      return;
    }

    if (!res.ok || !res.body) throw new Error(`Live event stream failed with status ${res.status}`);

    reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS; // a good connection clears the backoff
    emit({ type: "connected" });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (running) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let frameEnd;
      while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, frameEnd);
        buffer = buffer.slice(frameEnd + 2);
        if (handleFrame(frame).stop) {
          running = false;
          return;
        }
      }
    }
  } catch {
    // Network error, abort on teardown, or a non-OK response: all handled
    // the same way, by reconnecting below.
  } finally {
    emit({ type: "disconnected" });
  }

  if (running) {
    // Backoff rather than a fixed delay. A backend that is restarting or
    // deploying would otherwise be hit by every open tab every three
    // seconds for the length of the outage, which is exactly when it can
    // least afford it. Capped so recovery is still prompt.
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
    reconnectTimer = setTimeout(connectOnce, reconnectDelayMs);
  }
}

function start() {
  if (running) return;
  running = true;
  reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  connectOnce();
}

function stop() {
  running = false;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (abortController) abortController.abort();
  abortController = null;
  lastSnapshot = null;
}

/**
 * Listen to the stream. Returns an unsubscribe function.
 *
 * The handler is called with {type, data}: "snapshot" for the shared
 * live view, "notice" and "notice-revoked" for Director Console
 * messages, and "connected"/"disconnected" with no data.
 */
export function subscribeToLiveStream(handler) {
  subscribers.add(handler);
  if (subscribers.size === 1) start();
  // A subscriber joining after the first snapshot has already arrived
  // should not have to wait up to three seconds to see anything.
  else if (lastSnapshot) {
    try {
      handler({ type: "snapshot", data: lastSnapshot });
    } catch (err) {
      console.error("[LIVE STREAM] A new subscriber threw on its first snapshot:", err);
    }
  }

  return () => {
    subscribers.delete(handler);
    if (subscribers.size === 0) stop();
  };
}

/** The most recent snapshot, or null if none has arrived yet. */
export function getLastSnapshot() {
  return lastSnapshot;
}
