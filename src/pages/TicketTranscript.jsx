import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch, API_BASE } from "../api";
import { usePolling } from "../hooks/usePolling";
import DiscordIdentity from "../components/DiscordIdentity";

const POLL_MS = 15_000;

function formatBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Same token apiFetch attaches as an Authorization header -- passed as a
// query param here instead, since a plain <img>/<a> tag can't set custom
// headers (see tsrp-panel-api's routes/tickets.js requireAuthFlexible).
function attachmentUrl(id) {
  const token = localStorage.getItem("tsrp_token");
  return `${API_BASE}/tickets/attachments/${id}?token=${encodeURIComponent(token ?? "")}`;
}

function AttachmentView({ attachment }) {
  if (attachment.status !== "ok") {
    const label = attachment.status === "too_large" ? "too large to archive" : "failed to archive";
    return (
      <div className="muted" style={{ fontSize: "var(--text-xs)", fontStyle: "italic" }}>
        📎 {attachment.filename} ({label}{attachment.sizeBytes ? `, ${formatBytes(attachment.sizeBytes)}` : ""})
      </div>
    );
  }

  const isImage = (attachment.contentType || "").startsWith("image/");
  const url = attachmentUrl(attachment.id);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={attachment.filename}
          style={{ maxWidth: 360, maxHeight: 360, borderRadius: "var(--radius-md)", display: "block", marginTop: 4 }}
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      download={attachment.filename}
      style={{
        display: "inline-block", marginTop: 4, padding: "4px 10px", borderRadius: "var(--radius-full)",
        background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)", fontSize: "var(--text-xs)",
      }}
    >
      📎 {attachment.filename} {attachment.sizeBytes ? `(${formatBytes(attachment.sizeBytes)})` : ""}
    </a>
  );
}

function MessageRow({ message }) {
  return (
    <div className="loa-card" style={{ marginBottom: 8 }}>
      <div className="button-row" style={{ justifyContent: "space-between" }}>
        <strong>{message.authorTag}</strong>
        <span className="muted" style={{ fontSize: "var(--text-xs)" }}>{new Date(message.createdAt).toLocaleString()}</span>
      </div>
      {message.content && <p style={{ margin: "6px 0", whiteSpace: "pre-wrap" }}>{message.content}</p>}
      {message.isEmbed && !message.content && <p className="muted" style={{ margin: "6px 0", fontStyle: "italic" }}>[embed]</p>}
      {message.attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {message.attachments.map(a => <AttachmentView key={a.id} attachment={a} />)}
        </div>
      )}
    </div>
  );
}

export default function TicketTranscript() {
  const { ticketNumber } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  usePolling(
    () => apiFetch(`/tickets/${ticketNumber}`).then(d => { setData(d); setError(null); }).catch(err => setError(err.message)),
    POLL_MS,
    [ticketNumber]
  );

  if (error && !data) {
    return (
      <div className="content">
        <div className="page-header"><h1>Ticket Transcript</h1></div>
        <div className="error-banner">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="content">
        <div className="page-header"><h1>Ticket Transcript</h1></div>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const { ticket, messages } = data;

  return (
    <div className="content">
      <div className="button-row">
        <Link to="/tickets" className="secondary" style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)" }}>&larr; Back to Tickets</Link>
      </div>
      <div className="page-header" style={{ marginTop: 12 }}>
        <h1>Ticket #{ticket.ticket_number}</h1>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="card-grid" style={{ marginBottom: 20 }}>
        <div className="stat-tile">
          <div className="muted">Opened By</div>
          <DiscordIdentity nickname={ticket.opener_nickname} username={ticket.opener_username} discordId={ticket.opener_discord_id} avatarHash={ticket.opener_avatar_hash} showAvatar={false} showId={false} />
        </div>
        <div className="stat-tile">
          <div className="muted">Claimed By</div>
          {ticket.claimed_by
            ? <DiscordIdentity nickname={ticket.claimer_nickname} username={ticket.claimer_username} discordId={ticket.claimed_by} avatarHash={ticket.claimer_avatar_hash} showAvatar={false} showId={false} />
            : <div>Unclaimed</div>}
        </div>
        <div className="stat-tile">
          <div className="muted">Closed By</div>
          {ticket.closed_by
            ? <DiscordIdentity nickname={ticket.closer_nickname} username={ticket.closer_username} discordId={ticket.closed_by} avatarHash={ticket.closer_avatar_hash} showAvatar={false} showId={false} />
            : <div>Automatic</div>}
        </div>
        <div className="stat-tile"><div className="muted">Close Reason</div><div>{ticket.close_reason || "--"}</div></div>
        <div className="stat-tile"><div className="muted">Opened</div><div>{new Date(ticket.opened_at).toLocaleString()}</div></div>
        <div className="stat-tile"><div className="muted">Closed</div><div>{ticket.closed_at ? new Date(ticket.closed_at).toLocaleString() : "--"}</div></div>
      </div>

      <h2>Messages ({messages.length})</h2>
      {messages.length === 0 && <p className="muted">No messages were recorded for this ticket.</p>}
      {messages.map(m => <MessageRow key={m.id} message={m} />)}
    </div>
  );
}
