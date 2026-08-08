import { useMemo, useState } from "react";
import { apiFetch } from "../api";
import DiscordAvatar from "../components/DiscordAvatar";
import PublicNav from "../components/PublicNav";
import { usePolling } from "../hooks/usePolling";

const LEADERSHIP_TIER = "leadership";
const ROSTER_POLL_MS = 30_000; // "moderately active" tier -- staffCache itself only refreshes every 5min server-side, this just picks that up promptly

export default function Roster() {
  const [staff, setStaff] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  usePolling(() => apiFetch("/public/staff", { auth: false })
    .then(data => {
      setStaff(data.staff);
      setTiers(data.tiers);
      setError(null);
    })
    .catch(err => setError(err.message)), ROSTER_POLL_MS);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!staff) return null;
    if (!q) return staff;
    return staff.filter(m => m.username.toLowerCase().includes(q) || m.rankLabel.toLowerCase().includes(q));
  }, [staff, q]);

  const byTier = useMemo(() => {
    const map = new Map(tiers.map(t => [t.key, []]));
    for (const member of filtered ?? []) {
      if (!map.has(member.tier)) map.set(member.tier, []);
      map.get(member.tier).push(member);
    }
    return map;
  }, [filtered, tiers]);

  const nonEmptyTiers = tiers.filter(t => (byTier.get(t.key) ?? []).length > 0);
  const leadership = byTier.get(LEADERSHIP_TIER) ?? [];
  const restTiers = nonEmptyTiers.filter(t => t.key !== LEADERSHIP_TIER);

  return (
    <div className="home-page">
      <PublicNav />

      <div className="board-header">
        <h1>Staff Roster</h1>
        <p className="muted">
          {staff ? `${staff.length} staff member${staff.length === 1 ? "" : "s"} across ${tiers.length} departments.` : "Everyone currently on the Texas State RP staff team."}
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!staff && !error && <p className="muted">Loading…</p>}

      {staff && (
        <>
          <div className="roster-toolbar">
            <input
              type="text"
              className="roster-search"
              placeholder="Search by name or rank..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {nonEmptyTiers.length > 1 && (
              <nav className="roster-jumpnav">
                {nonEmptyTiers.map(t => (
                  <a key={t.key} href={`#tier-${t.key}`}>{t.label}</a>
                ))}
              </nav>
            )}
          </div>

          {filtered.length === 0 && (
            <p className="muted">No staff match "{query}".</p>
          )}

          {leadership.length > 0 && (
            <section className="roster-tier" id={`tier-${LEADERSHIP_TIER}`}>
              <h2 className="roster-tier-head">Leadership</h2>
              <div className="roster-leadership-grid">
                {leadership.map(m => (
                  <div className="roster-leader-card" key={m.discordId}>
                    <DiscordAvatar discordId={m.discordId} avatarHash={m.avatarHash} size={56} />
                    <span className="roster-leader-name">{m.username}</span>
                    <span className="roster-leader-rank">{m.rankLabel}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {restTiers.map(t => (
            <section className="roster-tier" id={`tier-${t.key}`} key={t.key}>
              <h2 className="roster-tier-head">{t.label}</h2>
              <div className="roster-list">
                {byTier.get(t.key).map(m => (
                  <div className="roster-row" key={m.discordId}>
                    <DiscordAvatar discordId={m.discordId} avatarHash={m.avatarHash} size={32} />
                    <span className="roster-row-name">{m.username}</span>
                    <span className="roster-row-rank">{m.rankLabel}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
