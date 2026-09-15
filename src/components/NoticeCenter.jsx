// ============================================================
//  NOTICE CENTRE -- how a Director Console message actually appears.
//
//  Two presentations, matching the two promises:
//
//  An IMPORTANT notice is a modal over the panel with one way out:
//  Acknowledge. No backdrop click, no Escape, no close button. The point
//  of important is that it was seen, and a dialog somebody can flick away
//  cannot tell the difference between "read" and "dismissed". They are
//  shown one at a time, oldest first, so three of them are three
//  decisions rather than a wall.
//
//  A QUICK notice is a toast in the corner that fades out on its own. It
//  never blocks anything, because it is not owed an answer.
// ============================================================
import { useState } from "react";
import { useNotices } from "../context/NoticesContext";
import Linkify from "./Linkify";

function when(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function label(notice) {
  return notice.channel === "pm" ? "Private message" : "Announcement";
}

function ImportantNotice({ notice, remaining, onAcknowledge, busy }) {
  return (
    <div className="nc-backdrop" role="dialog" aria-modal="true" aria-labelledby="nc-title">
      <div className={`nc-modal ${notice.channel === "pm" ? "nc-modal-pm" : ""}`}>
        <div className="nc-head">
          <span className="nc-kind">{label(notice)}</span>
          {remaining > 1 && (
            <span className="nc-remaining">1 of {remaining}</span>
          )}
        </div>

        <h2 className="nc-title" id="nc-title">
          {notice.channel === "pm" ? "A message for you" : "Staff announcement"}
        </h2>

        <p className="nc-body"><Linkify text={notice.body} /></p>

        <div className="nc-meta">
          <span>From {notice.createdByName || "a director"}</span>
          <span>{when(notice.createdAt)}</span>
        </div>

        <button className="nc-ack" onClick={() => onAcknowledge(notice.id)} disabled={busy} autoFocus>
          {busy ? "Saving…" : "Acknowledge"}
        </button>

        <p className="nc-foot">
          This stays here until you acknowledge it, including if you close the panel and come back.
        </p>
      </div>
    </div>
  );
}

function QuickToast({ notice, onDismiss }) {
  return (
    <div className={`nc-toast ${notice.channel === "pm" ? "nc-toast-pm" : ""}`} role="status">
      <div className="nc-toast-head">
        <span className="nc-kind">{label(notice)}</span>
        <button className="nc-toast-x" onClick={() => onDismiss(notice.id)} aria-label="Dismiss">×</button>
      </div>
      <p className="nc-toast-body"><Linkify text={notice.body} /></p>
      <p className="nc-toast-meta">{notice.createdByName || "A director"}</p>
    </div>
  );
}

export default function NoticeCenter() {
  const { important, quick, acknowledge, dismissQuick } = useNotices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Oldest first: the first one sent is the first one owed an answer.
  const current = important[0] ?? null;

  async function handleAcknowledge(id) {
    setBusy(true);
    setError(null);
    try {
      await acknowledge(id);
    } catch (err) {
      setError(err.message || "Could not record that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {current && (
        <>
          <ImportantNotice
            notice={current}
            remaining={important.length}
            onAcknowledge={handleAcknowledge}
            busy={busy}
          />
          {error && <div className="nc-error" role="alert">{error}</div>}
        </>
      )}

      {quick.length > 0 && (
        <div className="nc-toasts">
          {quick.map(notice => (
            <QuickToast key={notice.id} notice={notice} onDismiss={dismissQuick} />
          ))}
        </div>
      )}
    </>
  );
}
