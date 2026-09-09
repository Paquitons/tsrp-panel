import { useState } from "react";
import PageShell from "../components/primitives/PageShell";
import Banner from "../components/primitives/Banner";
import AsyncBoundary from "../components/primitives/AsyncBoundary";
import DiscordIdentity from "../components/DiscordIdentity";
import Modal from "../components/primitives/Modal";
import { useApiQuery, useApiMutation } from "../hooks/useApiQuery";

const POLL_MS = 30_000;

// ==================================================================
// In-Game Permissions
//
// Shows what the bot's audit found: people holding staff power in the
// game that their rank and duty status do not account for.
//
// Nothing on this page removes anybody's power, and the copy says so
// rather than implying a button exists. The list ER:LC exposes is the
// private server's permanent staff list, which its API cannot edit, so
// acting on a finding means going and changing it on Roblox.
// ==================================================================

const SEVERITY = {
  unknown_person: "critical",
  not_staff: "critical",
  above_rank: "warning",
  unverified: "warning",
  off_duty: "notice",
};

function Age({ since }) {
  const ms = Date.now() - since;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return <>{mins}m</>;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return <>{hours}h</>;
  return <>{Math.floor(hours / 24)}d</>;
}

function FindingRow({ f, onAccept }) {
  const severity = SEVERITY[f.finding] ?? "notice";
  const name = f.staff_nickname || f.staff_username || null;

  return (
    <div className={`perm-row perm-${severity}`}>
      <div className="perm-who">
        <span className="perm-roblox">{f.roblox_username || `Roblox ${f.roblox_id}`}</span>
        {f.discord_id ? (
          <DiscordIdentity
            variant="row"
            nickname={f.staff_nickname}
            username={f.staff_username}
            discordId={f.discord_id}
            avatarHash={f.staff_avatar_hash}
            size={20}
            showId={false}
          />
        ) : (
          <span className="muted perm-nolink">No linked Discord account</span>
        )}
      </div>

      <div className="perm-what">
        <span className={`perm-tag perm-tag-${severity}`}>{f.label}</span>
        <span className="muted perm-levels">
          holds <strong>{f.held_level}</strong>
          {f.entitled_level === "none" ? ", entitled to none" : `, entitled to ${f.entitled_level}`}
        </span>
        {f.rank && <span className="muted perm-rank">{f.rank.replace(/_/g, " ").toLowerCase()}</span>}
        {f.detail && <span className="muted perm-detail">{f.detail}</span>}
      </div>

      <div className="perm-meta">
        <span className="muted" title={new Date(f.first_seen_at).toLocaleString()}>
          <Age since={f.first_seen_at} />
        </span>
        <button className="secondary small" onClick={() => onAccept(f)}>Allow</button>
      </div>
    </div>
  );
}

export default function Permissions() {
  const query = useApiQuery(["permissions", "findings"], "/permissions/findings", { refetchInterval: POLL_MS });
  const data = query.data;
  const [accepting, setAccepting] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);

  const accept = useApiMutation({ invalidateKeys: [["permissions", "findings"]] });

  async function submitAccept(e) {
    e.preventDefault();
    setError(null);
    try {
      await accept.mutateAsync({ path: `/permissions/findings/${accepting.id}/accept`, body: { reason } });
      setAccepting(null);
      setReason("");
    } catch (err) {
      setError(err.message);
    }
  }

  const findings = data?.findings ?? [];
  const stale = data?.lastReadingAt ? Date.now() - data.lastReadingAt > 5 * 60 * 1000 : false;

  return (
    <PageShell title="In-Game Permissions">
      <p className="muted card-subtitle" style={{ maxWidth: "70ch" }}>
        Who currently holds moderator or admin power in the game that their rank and duty
        status do not account for. This is a report: changing it means editing the server's
        staff list on Roblox.
      </p>

      {stale && (
        <Banner>
          The last reading from the game server is over five minutes old, so this may be out of date.
        </Banner>
      )}

      <AsyncBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        data={findings}
        isEmpty={f => f.length === 0}
        emptyMessage="Nobody is holding in-game power they shouldn't have."
      >
        {() => (
          <>
            <div className="perm-summary">
              {Object.entries(data.counts).map(([key, n]) => (
                <span key={key} className={`perm-tag perm-tag-${SEVERITY[key] ?? "notice"}`}>
                  {n} {findings.find(f => f.finding === key)?.label ?? key}
                </span>
              ))}
            </div>

            <div className="perm-list">
              {findings.map(f => <FindingRow key={f.id} f={f} onAccept={setAccepting} />)}
            </div>
          </>
        )}
      </AsyncBoundary>

      {accepting && (
        <Modal onClose={() => { setAccepting(null); setError(null); }} labelledBy="perm-accept-title">
          <h2 id="perm-accept-title">Allow this?</h2>
          <p className="muted">
            {accepting.roblox_username || accepting.roblox_id} holds <strong>{accepting.held_level}</strong> in game.
            Allowing it stops this being reported. It does not change anything in the game.
          </p>
          <form onSubmit={submitAccept}>
            <label>Why is this allowed?</label>
            <input
              required
              maxLength={300}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Server owner, partner account, agreed with management..."
            />
            {error && <Banner>{error}</Banner>}
            <div className="button-row">
              <button className="primary" type="submit" disabled={accept.isPending}>
                {accept.isPending ? "Saving…" : "Allow"}
              </button>
              <button className="secondary" type="button" onClick={() => { setAccepting(null); setError(null); }}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </PageShell>
  );
}
