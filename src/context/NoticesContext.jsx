// ============================================================
//  NOTICES -- announcements and private messages from the Director
//  Console, received.
//
//  Two lists, because the two priorities are two different promises and
//  neither is a special case of the other:
//
//  IMPORTANT notices are fetched on load, pushed live, and stay until
//  the staff member presses Acknowledge. They survive a reload because
//  the server still has them; nothing is kept in this tab that would
//  bring one back on its own.
//
//  QUICK notices exist only here, in memory, for as long as this panel
//  session lasts. They are never fetched -- the server has no endpoint
//  that would return one -- so closing the tab is the end of them. That
//  is enforced by there being no persistence to opt out of, rather than
//  by remembering to clear something.
//
//  Mounted once, above the router, so a notice reaches somebody wherever
//  they are in the panel rather than only on the page that happened to
//  subscribe.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { subscribeToLiveStream } from "../liveStream";
import { useAuth } from "./AuthContext";

const NoticesContext = createContext(null);

// How long a quick notice stays on screen. Long enough to read a couple
// of sentences without hunting for the close button, short enough that it
// is gone before it becomes part of the furniture.
const QUICK_LIFETIME_MS = 30_000;

export function NoticesProvider({ children }) {
  const { user } = useAuth();
  const [important, setImportant] = useState([]);
  const [quick, setQuick] = useState([]);

  // Timers for auto-dismissing quick notices, cleared on unmount so a
  // logout mid-countdown cannot fire setState on a dead component.
  const quickTimers = useRef(new Map());

  const dropQuick = useCallback(id => {
    setQuick(list => list.filter(n => n.id !== id));
    const timer = quickTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      quickTimers.current.delete(id);
    }
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      const { notices } = await apiFetch("/notices/pending");
      setImportant(notices ?? []);
    } catch {
      // A failed refresh leaves whatever is already on screen rather than
      // clearing it. An important notice disappearing because one request
      // failed is the one outcome this must not produce.
    }
  }, []);

  // ---- Load, and reload whenever the stream reconnects ----
  //
  // The reconnect case is the one that matters: a notice sent while this
  // tab was disconnected was pushed to nobody here, so the only way to
  // learn about it is to ask again once the connection is back. Quick
  // notices sent during that gap are genuinely missed, which is what
  // quick means.
  useEffect(() => {
    if (!user) {
      setImportant([]);
      setQuick([]);
      return;
    }
    refreshPending();
  }, [user, refreshPending]);

  useEffect(() => {
    if (!user) return;

    return subscribeToLiveStream(event => {
      if (event.type === "connected") {
        refreshPending();
        return;
      }

      if (event.type === "notice") {
        const notice = event.data;
        if (notice.priority === "important") {
          setImportant(list => (list.some(n => n.id === notice.id) ? list : [...list, notice]));
        } else {
          setQuick(list => (list.some(n => n.id === notice.id) ? list : [...list, notice]));
          const timer = setTimeout(() => dropQuick(notice.id), QUICK_LIFETIME_MS);
          quickTimers.current.set(notice.id, timer);
        }
        return;
      }

      if (event.type === "notice-revoked") {
        const { id } = event.data;
        setImportant(list => list.filter(n => n.id !== id));
        dropQuick(id);
      }
    });
  }, [user, refreshPending, dropQuick]);

  useEffect(() => {
    const timers = quickTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  /**
   * Acknowledge an important notice.
   *
   * Removed from the list only after the server has recorded it. Dropping
   * it optimistically would mean a failed request leaves the staff member
   * believing they have acknowledged something the server will hand back
   * on their next load, which is worse than a moment of latency.
   */
  const acknowledge = useCallback(async id => {
    await apiFetch(`/notices/${id}/ack`, { method: "POST" });
    setImportant(list => list.filter(n => n.id !== id));
  }, []);

  return (
    <NoticesContext.Provider value={{ important, quick, acknowledge, dismissQuick: dropQuick }}>
      {children}
    </NoticesContext.Provider>
  );
}

export function useNotices() {
  const ctx = useContext(NoticesContext);
  if (!ctx) throw new Error("useNotices must be used inside a NoticesProvider.");
  return ctx;
}
