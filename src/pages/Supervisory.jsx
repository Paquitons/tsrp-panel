// ==================================================================
// Supervisory
//
// Oversight of the people moderating the server, as opposed to Internal
// Affairs, which investigates the staff team. The two were sharing a page
// and should not have been: a live moderation watchlist sat in front of
// the tier that does not moderate, and away from the tier that oversees
// it.
//
// Two things live here:
//
//   Ban BOLO review, which had API routes and no screen at all. The queue
//   was reachable only through /bolo in Discord, so the panel could show
//   you a pending ban request and give you no way to answer it.
//
//   Kick rejoin cooldowns, moved off the Internal Affairs page.
//
// The real gate is isSupervisoryOrAbove on the API. This page only
// decides what is drawn.
// ==================================================================
import { useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import DiscordIdentity from "../components/DiscordIdentity";
import Card from "../components/primitives/Card";
import PageShell from "../components/primitives/PageShell";
import Banner from "../components/primitives/Banner";
import SectionHeader from "../components/primitives/SectionHeader";
import Tabs from "../components/Tabs";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import { useApiQuery } from "../hooks/useApiQuery";
import { expiresLabel, scrollPageToTop } from "../utils";
import { canSeeSupervisory } from "../access";
import { useOpenOnArrival } from "../hooks/useOpenOnArrival";

const POLL_MS = 15_000;

const SECTIONS = [
  { value: "bolos", label: "Ban BOLOs" },
  { value: "cooldowns", label: "Rejoin Cooldowns" },
];

function when(ts) {
  return ts ? new Date(ts).toLocaleString() : "";
}

// ------------------------------------------------------------------
// Ban BOLO review
// ------------------------------------------------------------------
function BoloQueue({ onError }) {
  // Skipping is per review session and never persisted, matching what the
  // bot's own /bolo does: it means "not this one right now", not "decided".
  const [skipped, setSkipped] = useState([]);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const query = useApiQuery(
    ["punishments", "bolo-queue", skipped.join(",")],
    `/punishments/bolo/queue${skipped.length ? `?excludeIds=${skipped.join(",")}` : ""}`,
    { refetchInterval: POLL_MS },
  );

  const bolo = query.data?.bolo ?? null;
  const remaining = query.data?.remaining ?? 0;

  async function decide(path, body) {
    setBusy(true);
    onError(null);
    try {
      await apiFetch(path, { method: "PATCH", ...(body ? { body } : {}) });
      setReason("");
      setDeclining(false);
      await query.refetch();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (query.isError && !query.data) return <Banner>{query.error.message}</Banner>;
  if (!query.data) return <p className="muted">Loading…</p>;

  if (!bolo) {
    return (
      <Card>
        <SectionHeader title="Ban BOLO Review" count={0} countLabel="waiting" />
        <p className="muted" style={{ margin: 0 }}>
          {skipped.length
            ? "Nothing left that you have not skipped this session."
            : "No ban requests are waiting for review."}
        </p>
        {skipped.length > 0 && (
          <div className="button-row" style={{ marginTop: 12 }}>
            <button className="secondary small" onClick={() => setSkipped([])}>Show skipped again</button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader
        title="Ban BOLO Review"
        count={remaining}
        countLabel="waiting"
        subtitle="A moderator has asked for this player to be banned. Accepting issues the ban in game under your name."
      />

      <div className="sv-bolo">
        <div className="sv-bolo-head">
          <Avatar username={bolo.target_roblox_username} robloxId={bolo.robloxId} size={40} />
          <div>
            <p className="sv-bolo-name">{bolo.target_roblox_username}</p>
            <p className="muted sv-bolo-sub">Requested {when(bolo.created_at)}</p>
          </div>
        </div>

        <dl className="sv-facts">
          <div>
            <dt>Reason</dt>
            <dd>{bolo.reason || "None given"}</dd>
          </div>
          {(bolo.description) && (
            <div>
              <dt>Evidence</dt>
              <dd>{bolo.description}</dd>
            </div>
          )}
          <div>
            <dt>Requested by</dt>
            <dd>
              {bolo.issuer_discord_id ? (
                <DiscordIdentity
                  variant="row"
                  nickname={bolo.issuer_nickname}
                  username={bolo.issuer_username}
                  discordId={bolo.issuer_discord_id}
                  avatarHash={bolo.issuer_avatar_hash}
                  size={18}
                  showId={false}
                />
              ) : "Unknown"}
            </dd>
          </div>
          {Array.isArray(bolo.moderationHistory) && bolo.moderationHistory.length > 0 && (
            <div>
              <dt>Prior history</dt>
              <dd>
                <ul className="sv-history">
                  {bolo.moderationHistory.map((h, i) => (
                    <li key={i}>{h.type}: {h.reason}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>

        {declining ? (
          <div className="sv-decline">
            <label>Why are you declining?</label>
            <AutoGrowTextarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional, but it helps the person who asked." />
            <div className="button-row">
              <button
                className="btn-red small"
                disabled={busy}
                onClick={() => decide(`/punishments/${bolo.id}/bolo-decline`, { reason })}
              >
                {busy ? "Declining…" : "Confirm decline"}
              </button>
              <button className="secondary small" onClick={() => { setDeclining(false); setReason(""); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="button-row sv-bolo-actions">
            <button
              className="btn-green small"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Accept this BOLO? ${bolo.target_roblox_username} will be banned in game immediately.`)) return;
                decide(`/punishments/${bolo.id}/bolo-accept`);
              }}
            >
              {busy ? "Working…" : "Accept and ban"}
            </button>
            <button className="btn-red small" disabled={busy} onClick={() => setDeclining(true)}>Decline</button>
            <button
              className="secondary small"
              disabled={busy}
              onClick={() => setSkipped(list => [...list, bolo.id])}
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------
// Kick rejoin cooldowns
// ------------------------------------------------------------------
function CooldownList({ onError }) {
  const [removingId, setRemovingId] = useState(null);

  const query = useApiQuery(["punishments", "kick-cooldowns"], "/punishments/kick-cooldowns/active", {
    refetchInterval: POLL_MS,
    select: d => d.cooldowns,
  });
  const cooldowns = query.data ?? [];

  async function remove(id, label) {
    if (!confirm(`Remove ${label}'s rejoin cooldown early? They will be able to rejoin normally right away.`)) return;
    setRemovingId(id);
    onError(null);
    try {
      await apiFetch(`/punishments/kick-cooldowns/${id}`, { method: "DELETE" });
      await query.refetch();
    } catch (err) {
      onError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Card>
      <SectionHeader
        title="Active Rejoin Cooldowns"
        count={cooldowns.length}
        subtitle="Everyone currently on a rejoin cooldown from a logged kick. These start automatically when a kick is logged from the Dashboard, and the bot re-kicks anyone who comes back inside their window."
      />

      {query.isLoading && <p className="muted">Loading…</p>}
      {!query.isLoading && cooldowns.length === 0 && <p className="muted">Nobody is on a rejoin cooldown.</p>}

      {cooldowns.length > 0 && (
        <div className="log-card-list">
          {cooldowns.map(c => (
            <div className="log-card" key={c.id}>
              <div className="log-card-issuer-row">
                <span className="log-card-target" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar username={c.roblox_username} robloxId={c.roblox_id} size={22} />
                  {c.roblox_username}
                </span>
                <span className="loa-status-approved" style={{ marginLeft: "auto" }}>{expiresLabel(c.expires_at)}</span>
              </div>
              <div className="log-card-body">
                {c.reason && <div className="log-card-field"><span className="muted">Reason:</span> {c.reason}</div>}
                <div className="log-card-field">
                  <span className="muted">Logged by:</span>{" "}
                  {c.logged_by_discord_id ? (
                    <DiscordIdentity
                      variant="row"
                      nickname={c.logged_by_nickname}
                      username={c.logged_by_username}
                      discordId={c.logged_by_discord_id}
                      avatarHash={c.logged_by_avatar_hash}
                      size={18}
                      showId={false}
                    />
                  ) : "Unknown"}
                </div>
                {c.rekick_count > 0 && (
                  <div className="log-card-field">
                    <span className="muted">Automatically re-kicked:</span> {c.rekick_count} time{c.rekick_count === 1 ? "" : "s"}
                  </div>
                )}
                <div className="button-row" style={{ marginTop: 8 }}>
                  <button className="btn-red small" disabled={removingId === c.id} onClick={() => remove(c.id, c.roblox_username)}>
                    {removingId === c.id ? "Removing…" : "Remove cooldown"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Supervisory() {
  const { user } = useAuth();
  const [section, setSection] = useState("bolos");
  const [error, setError] = useState(null);

  // /supervisory?do=cooldowns from the command palette.
  useOpenOnArrival(what => {
    if (SECTIONS.some(s => s.value === what)) setSection(what);
  });

  if (!canSeeSupervisory(user)) {
    return (
      <PageShell title="Supervisory">
        <Banner>This area is limited to Supervisory and above.</Banner>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Supervisory"
      subtitle="Oversight of moderation in the server: ban requests waiting on a decision, and who is currently locked out after a kick."
    >
      <div className="tab-stack">
        <Tabs tabs={SECTIONS} active={section} onChange={s => { setSection(s); setError(null); scrollPageToTop(); }} />
      </div>
      {error && <Banner>{error}</Banner>}
      {section === "bolos" && <BoloQueue onError={setError} />}
      {section === "cooldowns" && <CooldownList onError={setError} />}
    </PageShell>
  );
}
