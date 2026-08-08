import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch, API_BASE } from "../api";
import { usePolling } from "../hooks/usePolling";
import DiscordIdentity from "../components/DiscordIdentity";
import DiscordAvatar from "../components/DiscordAvatar";

const POLL_MS = 15_000;

// Matches Discord's own mention syntax as it's stored raw in an archived
// message's content: <@id>/<@!id> (user -- the "!" variant is a legacy
// nickname-mention marker, functionally identical), <@&id> (role),
// <#id> (channel), and the two ID-less broadcast mentions. One combined
// regex (not four separate passes) so pieces of text stay in their
// original order when split.
const MENTION_RE = /<@!?(\d+)>|<@&(\d+)>|<#(\d+)>|@everyone|@here/g;

/**
 * Splits a raw message content string into an array of plain strings and
 * resolved mention elements, using the `mentions` lookup the API resolved
 * server-side (see tsrp-panel-api's routes/tickets.js). Resolution
 * happens per-render from the id + the shared lookup table, not baked
 * into stored content, so this renders identically for a transcript from
 * five minutes ago or two years ago, and degrades to a plain "deleted"
 * label rather than breaking if the user/role/channel no longer exists.
 */
function renderContent(content, mentions) {
  if (!content) return null;

  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = MENTION_RE.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));

    const [full, userId, roleId, channelId] = match;
    if (userId) {
      const user = mentions.users?.[userId];
      const label = user?.nickname || user?.username || "deleted-user";
      parts.push(<span key={key++} className="discord-mention discord-mention-user">@{label}</span>);
    } else if (roleId) {
      const role = mentions.roles?.[roleId];
      const color = role?.color ? `#${role.color.toString(16).padStart(6, "0")}` : undefined;
      parts.push(
        <span key={key++} className="discord-mention discord-mention-role" style={color ? { color, background: `${color}26` } : undefined}>
          @{role?.name ?? "deleted-role"}
        </span>
      );
    } else if (channelId) {
      const channel = mentions.channels?.[channelId];
      parts.push(<span key={key++} className="discord-mention discord-mention-channel">#{channel?.name ?? "deleted-channel"}</span>);
    } else {
      // @everyone / @here -- no id, matched as literal text
      parts.push(<span key={key++} className="discord-mention discord-mention-everyone">{full}</span>);
    }

    lastIndex = match.index + full.length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));

  return parts;
}

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

function MessageRow({ message, mentions }) {
  // Prefer the live-resolved identity (kept current even on an old
  // transcript); fall back to the archived tag, which is the only thing
  // left once someone's left the server or the message came from a
  // webhook/bot that doesn't resolve as a normal guild member.
  const name = message.authorNickname || message.authorUsername || message.authorTag;

  return (
    <div className="transcript-message">
      <DiscordAvatar discordId={message.authorDiscordId} avatarHash={message.authorAvatarHash} size={40} className="transcript-message-avatar" />
      <div className="transcript-message-body">
        <div className="transcript-message-header">
          <strong>{name}</strong>
          <span className="muted" style={{ fontSize: "var(--text-xs)" }}>{new Date(message.createdAt).toLocaleString()}</span>
        </div>
        {message.content && <p className="transcript-message-content">{renderContent(message.content, mentions)}</p>}
        {message.isEmbed && !message.content && <p className="muted" style={{ margin: "2px 0", fontStyle: "italic" }}>[embed]</p>}
        {message.attachments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {message.attachments.map(a => <AttachmentView key={a.id} attachment={a} />)}
          </div>
        )}
      </div>
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

  const { ticket, messages, mentions } = data;

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
      {messages.map(m => <MessageRow key={m.id} message={m} mentions={mentions} />)}
    </div>
  );
}
