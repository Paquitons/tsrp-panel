import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { usePolling } from "../hooks/usePolling";
import DiscordIdentity from "../components/DiscordIdentity";

const LIST_POLL_MS = 15_000;

function formatDate(ms) {
  if (!ms) return "--";
  return new Date(ms).toLocaleString();
}

// ==================================================================
// Ticket Transcripts -- browse closed support tickets. Attachments
// (images/files) are archived permanently on close (see highrock-bot's
// ticketTranscripts.js) instead of the old "[attachment]" placeholder
// that relied on Discord's own CDN links staying valid forever.
// ==================================================================
export default function Tickets() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  usePolling(() => apiFetch("/tickets?limit=100").then(d => { setData(d); setError(null); }).catch(err => setError(err.message)), LIST_POLL_MS);

  if (error && !data) {
    return (
      <div className="content">
        <div className="page-header"><h1>Ticket Transcripts</h1></div>
        <div className="error-banner">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="content">
        <div className="page-header"><h1>Ticket Transcripts</h1></div>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const filtered = search.trim()
    ? data.tickets.filter(t =>
        String(t.ticket_number).includes(search.trim())
        || (t.opener_username ?? "").toLowerCase().includes(search.trim().toLowerCase())
        || (t.opener_nickname ?? "").toLowerCase().includes(search.trim().toLowerCase())
        || (t.close_reason ?? "").toLowerCase().includes(search.trim().toLowerCase())
      )
    : data.tickets;

  return (
    <div className="content">
      <div className="page-header"><h1>Ticket Transcripts</h1></div>
      {error && <div className="error-banner">{error}</div>}

      <input
        placeholder="Search by ticket #, opener, or close reason..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 400, width: "100%" }}
      />

      <div className="loa-list">
        {filtered.length === 0 && <p className="muted">No tickets found.</p>}
        {filtered.map(t => (
          <div
            className="loa-card loa-card-row"
            key={t.id}
            style={{ cursor: "pointer", flexWrap: "wrap", gap: 4 }}
            onClick={() => navigate(`/transcripts/${t.ticket_number}`)}
          >
            <div>
              <strong>Ticket #{t.ticket_number}</strong>
              <div className="muted" style={{ fontSize: "var(--text-xs)" }}>
                Opened by{" "}
                <DiscordIdentity
                  nickname={t.opener_nickname} username={t.opener_username} discordId={t.opener_discord_id}
                  avatarHash={t.opener_avatar_hash} showAvatar={false}
                />
                {" "}-- closed {formatDate(t.closed_at)}
              </div>
            </div>
            <span className="muted" style={{ marginLeft: "auto", fontSize: "var(--text-xs)" }}>
              {t.close_reason || "No reason given"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
