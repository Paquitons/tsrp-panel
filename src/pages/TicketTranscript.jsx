import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE } from "../api";
import PageShell from "../components/primitives/PageShell";
import Banner from "../components/primitives/Banner";
import { useApiQuery } from "../hooks/useApiQuery";
import DiscordIdentity from "../components/DiscordIdentity";
import DiscordAvatar from "../components/DiscordAvatar";

// A closed ticket's messages never change again, so there is nothing to
// poll for. The one exception is a name the server had not resolved yet
// (see pendingMentions in tsrp-panel-api's routes/tickets.js): the page
// asks again on this interval only while something is still pending, and
// stops the moment nothing is.
const IDENTITY_POLL_MS = 2_000;

// The first slice of messages is rendered synchronously so the transcript
// is on screen immediately; the rest is appended a chunk per frame. A
// long ticket can run to well over a thousand messages, and building all
// of them in one pass is what made a big transcript feel like it hung
// even after the data had arrived.
const FIRST_PAINT_MESSAGES = 60;
const MESSAGES_PER_FRAME = 150;

// Matches Discord's own mention syntax as it's stored raw in an archived
// message's content: <@id>/<@!id> (user -- the "!" variant is a legacy
// nickname-mention marker, functionally identical), <@&id> (role),
// <#id> (channel), and the two ID-less broadcast mentions. One combined
// regex (not four separate passes) so pieces of text stay in their
// original order when split.
const MENTION_RE = /<@!?(\d+)>|<@&(\d+)>|<#(\d+)>|@everyone|@here/g;

const EMPTY_PENDING = { users: new Set(), roles: new Set(), channels: new Set(), tags: new Map() };

/**
 * The ids the server has not resolved yet, as sets for lookup while
 * rendering, plus the archived tags this transcript already knows.
 *
 * A mentioned person who also SPOKE in this ticket has a real,
 * point-in-time name sitting in the transcript already (author_tag), so
 * there is no reason to show them as an unresolved placeholder while the
 * live lookup catches up. Only somebody mentioned but never seen here
 * falls back to the placeholder.
 */
function toPendingSets(pendingMentions, messages) {
  if (!pendingMentions) return EMPTY_PENDING;
  const tags = new Map();
  for (const m of messages ?? []) {
    if (m.authorDiscordId && m.authorTag && !tags.has(m.authorDiscordId)) tags.set(m.authorDiscordId, m.authorTag);
  }
  return {
    users: new Set(pendingMentions.users ?? []),
    roles: new Set(pendingMentions.roles ?? []),
    channels: new Set(pendingMentions.channels ?? []),
    tags,
  };
}

/**
 * Splits a raw message content string into an array of plain strings and
 * resolved mention elements, using the `mentions` lookup the API resolved
 * server-side (see tsrp-panel-api's routes/tickets.js). Resolution
 * happens per-render from the id + the shared lookup table, not baked
 * into stored content, so this renders identically for a transcript from
 * five minutes ago or two years ago, and degrades to a plain "deleted"
 * label rather than breaking if the user/role/channel no longer exists.
 *
 * `pending` is the set of ids the server has not looked up yet, which is
 * a different thing from an id it looked up and found gone. Those render
 * as a neutral placeholder for the second or two before the follow-up
 * request fills them in, rather than briefly and wrongly claiming the
 * person was deleted.
 */
function renderContent(content, mentions, pending = EMPTY_PENDING) {
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
      const label = user?.nickname || user?.username
        || (pending.users.has(userId) ? (pending.tags.get(userId) ?? "\u2026") : "deleted-user");
      parts.push(<span key={key++} className="discord-mention discord-mention-user">@{label}</span>);
    } else if (roleId) {
      if (pending.roles.has(roleId)) {
        parts.push(<span key={key++} className="discord-mention discord-mention-role">@{"\u2026"}</span>);
        lastIndex = match.index + full.length;
        continue;
      }
      const role = mentions.roles?.[roleId];
      const color = role?.color ? `#${role.color.toString(16).padStart(6, "0")}` : undefined;
      parts.push(
        <span key={key++} className="discord-mention discord-mention-role" style={color ? { color, background: `${color}26` } : undefined}>
          @{role?.name ?? "deleted-role"}
        </span>
      );
    } else if (channelId) {
      const channel = mentions.channels?.[channelId];
      const label = channel?.name ?? (pending.channels.has(channelId) ? "\u2026" : "deleted-channel");
      parts.push(<span key={key++} className="discord-mention discord-mention-channel">#{label}</span>);
    } else {
      // @everyone / @here -- no id, matched as literal text
      parts.push(<span key={key++} className="discord-mention discord-mention-everyone">{full}</span>);
    }

    lastIndex = match.index + full.length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));

  return parts;
}

/**
 * Same mention resolution as renderContent, but as plain text (e.g.
 * "@wellidontplaythis" instead of a styled span) -- used for the
 * copy/download export, which can't carry React elements or CSS.
 */
function mentionsToPlainText(content, mentions, pending = EMPTY_PENDING) {
  if (!content) return "";
  return content.replace(MENTION_RE, (full, userId, roleId, channelId) => {
    if (userId) {
      const user = mentions.users?.[userId];
      return `@${user?.nickname || user?.username || pending.tags.get(userId) || "deleted-user"}`;
    }
    if (roleId) return `@${mentions.roles?.[roleId]?.name ?? "deleted-role"}`;
    if (channelId) return `#${mentions.channels?.[channelId]?.name ?? "deleted-channel"}`;
    return full; // @everyone / @here read fine as-is
  });
}

function identityLabel(nickname, username, fallback) {
  return nickname || username || fallback;
}

/**
 * Builds a plain-text export of the whole transcript -- ticket metadata,
 * then every message as "[timestamp] Name: content", with mentions
 * resolved to real names and attachments listed by filename. Used for
 * both the copy-to-clipboard and download actions, so those two always
 * produce identical text.
 */
function buildTranscriptText(ticket, messages, mentions, pending) {
  const lines = [
    `Ticket #${ticket.ticket_number}`,
    `Opened by: ${identityLabel(ticket.opener_nickname, ticket.opener_username, "Unknown Member")}`,
    `Claimed by: ${ticket.claimed_by ? identityLabel(ticket.claimer_nickname, ticket.claimer_username, "Unknown Member") : "Unclaimed"}`,
    `Closed by: ${ticket.closed_by ? identityLabel(ticket.closer_nickname, ticket.closer_username, "Unknown Member") : "Automatic"}`,
    `Close reason: ${ticket.close_reason || "--"}`,
    `Opened: ${new Date(ticket.opened_at).toLocaleString()}`,
    `Closed: ${ticket.closed_at ? new Date(ticket.closed_at).toLocaleString() : "--"}`,
    "",
    "----------------------------------------",
    "",
  ];

  for (const m of messages) {
    const name = m.authorNickname || m.authorUsername || m.authorTag;
    lines.push(`[${new Date(m.createdAt).toLocaleString()}] ${name}:`);
    if (m.content) lines.push(mentionsToPlainText(m.content, mentions, pending));
    if (m.isEmbed && !m.content) lines.push("[embed]");
    for (const a of m.attachments) {
      lines.push(a.status === "ok" ? `[Attachment: ${a.filename}]` : `[Attachment: ${a.filename} -- ${a.status === "too_large" ? "too large to archive" : "failed to archive"}]`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatBytes(n) {
  if (!Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Fetches an attachment's bytes via a normal header-authenticated request
// (never a ?token= query param -- that would put the session JWT in the
// URL, server access logs, browser history, and Referer headers) and hands
// back an object URL for either inline <img> display or a download. The
// caller owns revoking it once done with it.
async function fetchAttachmentBlobUrl(id) {
  const token = localStorage.getItem("tsrp_token");
  const res = await fetch(`${API_BASE}/tickets/attachments/${id}`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) throw new Error(`Attachment request failed with status ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Fetches its bytes only once it is near the viewport.
 *
 * Every image in a transcript is authenticated, so it cannot be a plain
 * <img src> the browser lazy-loads for us -- each one is a separate
 * authenticated request whose result becomes a blob URL. Firing all of
 * them the moment the page renders means a ticket with thirty screenshots
 * opens thirty requests at once and competes with the page itself; almost
 * none of them are on screen. The observer keeps that to what is actually
 * being looked at, with a generous margin so scrolling stays smooth.
 */
function ImageAttachment({ attachment }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const holderRef = useRef(null);

  useEffect(() => {
    if (visible) return undefined;
    const node = holderRef.current;
    // No IntersectionObserver (an old browser, a test environment): load
    // it immediately rather than never.
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) setVisible(true);
    }, { rootMargin: "600px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    let objectUrl = null;
    fetchAttachmentBlobUrl(attachment.id)
      .then(u => { if (cancelled) { URL.revokeObjectURL(u); return; } objectUrl = u; setUrl(u); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, visible]);

  if (failed) {
    return (
      <div className="muted" style={{ fontSize: "var(--text-xs)", fontStyle: "italic" }}>
        📎 {attachment.filename} (failed to load)
      </div>
    );
  }
  if (!url) {
    // Keeps a box the observer can see and the layout can reserve, so
    // scrolling past does not make the page jump.
    return (
      <div ref={holderRef} className="muted" style={{ fontSize: "var(--text-xs)", minHeight: 120, minWidth: 160, display: "flex", alignItems: "center" }}>
        {visible ? "Loading image…" : `📎 ${attachment.filename}`}
      </div>
    );
  }
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

function FileAttachment({ attachment }) {
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    if (downloading) return;
    setDownloading(true);
    try {
      const url = await fetchAttachmentBlobUrl(attachment.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Couldn't download this attachment.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={downloading}
      style={{
        display: "inline-block", marginTop: 4, padding: "4px 10px", borderRadius: "var(--radius-full)",
        background: "var(--surface-sunken)", border: "1px solid var(--border-subtle)", fontSize: "var(--text-xs)",
        cursor: downloading ? "default" : "pointer",
      }}
    >
      📎 {attachment.filename} {attachment.sizeBytes ? `(${formatBytes(attachment.sizeBytes)})` : ""}{downloading ? " …" : ""}
    </button>
  );
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
  return isImage ? <ImageAttachment attachment={attachment} /> : <FileAttachment attachment={attachment} />;
}

function MessageRow({ message, mentions, pending }) {
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
        {message.content && <p className="transcript-message-content">{renderContent(message.content, mentions, pending)}</p>}
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
  const [copied, setCopied] = useState(false);

  // An archived transcript is immutable: the ticket is closed, and no
  // message will ever be added to it. So this does not poll on a timer
  // and does not refetch when the window regains focus, which is what it
  // used to do every fifteen seconds for as long as the tab stayed open.
  // The single reason to ask again is that the server told us some names
  // were still being resolved, and that stops as soon as they are.
  const query = useApiQuery(["ticket", ticketNumber], `/tickets/${ticketNumber}`, {
    refetchInterval: q => (q.state.data?.identitiesPending > 0 ? IDENTITY_POLL_MS : false),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const data = query.data;
  const error = query.error?.message;

  const messages = data?.messages;
  const pending = toPendingSets(data?.pendingMentions, messages);

  // Paints the first slice straight away and appends the rest a chunk per
  // frame, so a 1,500 message transcript appears at once instead of after
  // React has built every row.
  const [renderCount, setRenderCount] = useState(FIRST_PAINT_MESSAGES);
  useEffect(() => { setRenderCount(FIRST_PAINT_MESSAGES); }, [ticketNumber]);
  useEffect(() => {
    if (!messages || renderCount >= messages.length) return undefined;
    const id = requestAnimationFrame(() => setRenderCount(c => c + MESSAGES_PER_FRAME));
    return () => cancelAnimationFrame(id);
  }, [messages, renderCount]);

  async function copyTranscript() {
    const text = buildTranscriptText(data.ticket, data.messages, data.mentions, pending);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Couldn't copy to clipboard -- your browser may be blocking it.");
    }
  }

  function downloadTranscript() {
    const text = buildTranscriptText(data.ticket, data.messages, data.mentions, pending);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${data.ticket.ticket_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error && !data) {
    return (
      <PageShell title="Ticket Transcript">
        <Banner>{error}</Banner>
      </PageShell>
    );
  }
  if (!data) {
    return (
      <PageShell title="Ticket Transcript">
        <p className="muted">Loading…</p>
      </PageShell>
    );
  }

  const { ticket, mentions } = data;
  const shown = messages.slice(0, renderCount);

  return (
    <div className="content">
      <div className="button-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Link to="/tickets" className="secondary" style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)" }}>&larr; Back to Tickets</Link>
        <div className="button-row">
          <button className="secondary small" type="button" onClick={copyTranscript}>{copied ? "Copied!" : "Copy Transcript"}</button>
          <button className="secondary small" type="button" onClick={downloadTranscript}>Download Transcript</button>
        </div>
      </div>
      <div className="page-header" style={{ marginTop: 12 }}>
        <h1>Ticket #{ticket.ticket_number}</h1>
      </div>
      {error && <Banner>{error}</Banner>}
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
      {shown.map(m => <MessageRow key={m.id} message={m} mentions={mentions} pending={pending} />)}
      {shown.length < messages.length && (
        <p className="muted" style={{ fontSize: "var(--text-xs)" }}>
          Loading the rest of the transcript ({shown.length} of {messages.length})…
        </p>
      )}
    </div>
  );
}
