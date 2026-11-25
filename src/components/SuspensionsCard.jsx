import { useState } from "react";
import { apiFetch } from "../api";
import { useStaffSearch } from "../hooks/useStaffSearch";
import { useApiQuery } from "../hooks/useApiQuery";
import { timeAgo } from "../utils";
import PortalDropdown from "./PortalDropdown";
import DiscordAvatar from "./DiscordAvatar";
import DiscordIdentity from "./DiscordIdentity";
import AutoGrowTextarea from "./AutoGrowTextarea";
import Card from "./primitives/Card";
import Banner from "./primitives/Banner";
import SectionHeader from "./primitives/SectionHeader";

// Suspend a staff member, or lift a suspension. Suspending gives the
// Suspended role, which blocks the Staff Panel for them until it is
// lifted. Shown to IA Officer and up, and to Management.
// `bare` drops the card frame, for use inside a page that already has one.
export default function SuspensionsCard({ bare = false }) {
  const search = useStaffSearch();
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const active = useApiQuery(["suspensions", "active"], "/suspensions/active", { refetchInterval: 15_000, select: d => d.suspensions });

  async function submit(e) {
    e.preventDefault();
    setError(null); setDone(null);
    if (!search.target) { setError("Pick a staff member first."); return; }
    setBusy(true);
    try {
      await apiFetch("/suspensions", { method: "POST", body: { discordId: search.target.discordId, reason } });
      setDone(`${search.target.nickname ?? search.target.username} has been suspended.`);
      setReason(""); search.reset();
      active.refetch();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function lift(row) {
    const name = row.target_nickname || row.target_username || "this person";
    if (!confirm(`Lift ${name}'s suspension? They get Staff Panel access back straight away.`)) return;
    setError(null); setDone(null);
    try {
      await apiFetch(`/suspensions/${row.discord_id}/lift`, { method: "POST", body: {} });
      setDone(`${name}'s suspension has been lifted.`);
      active.refetch();
    } catch (err) { setError(err.message); }
  }

  const rows = active.data ?? [];

  const Frame = bare ? "div" : Card;
  return (
    <Frame>
      <SectionHeader
        title="Suspend"
        subtitle="Gives the Suspended role. They lose all Staff Panel access until the suspension is lifted."
      />
      {error && <Banner>{error}</Banner>}
      {done && <Banner variant="success">{done}</Banner>}
      <form onSubmit={submit}>
        <label>Staff Member</label>
        <div className="autocomplete-wrap">
          <input
            ref={search.inputRef}
            required
            autoComplete="off"
            value={search.query}
            onChange={e => search.onQueryChange(e.target.value)}
            onFocus={() => search.suggestions.length > 0 && search.setShowSuggestions(true)}
            placeholder="Search by username or nickname"
          />
          <PortalDropdown anchorRef={search.inputRef} open={search.showSuggestions} onClose={() => search.setShowSuggestions(false)} className="autocomplete-list-portal">
            {search.suggestions.map(s => (
              <div key={s.discordId} className="autocomplete-item" onClick={() => search.pick(s)}>
                <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={26} />
                <span className="autocomplete-name">{s.nickname ?? s.username}</span>
              </div>
            ))}
          </PortalDropdown>
        </div>
        <label>Reason</label>
        <AutoGrowTextarea required value={reason} onChange={e => setReason(e.target.value)} />
        <button className="primary" type="submit" disabled={busy}>{busy ? "Suspending…" : "Suspend"}</button>
      </form>

      <SectionHeader title="Currently Suspended" count={rows.length} />
      {active.isLoading && <p className="muted">Loading…</p>}
      {!active.isLoading && rows.length === 0 && <p className="muted">Nobody is suspended.</p>}
      <div className="log-card-list">
        {rows.map(row => (
          <div className="log-card" key={row.id}>
            <div className="log-card-issuer-row">
              <DiscordIdentity
                variant="row"
                nickname={row.target_nickname}
                username={row.target_username}
                discordId={row.discord_id}
                avatarHash={row.target_avatar_hash}
                size={28}
                showId={false}
              />
              <button className="secondary small" style={{ marginLeft: "auto" }} onClick={() => lift(row)}>Lift</button>
            </div>
            <div className="log-card-body">
              <div className="log-card-field">
                {row.reason}
                <span className="muted"> (by {row.issuer_nickname || row.issuer_username || "Unknown Member"} {timeAgo(row.created_at)})</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}
