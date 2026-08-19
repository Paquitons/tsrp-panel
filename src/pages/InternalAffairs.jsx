import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import PortalDropdown from "../components/PortalDropdown";
import CustomSelect from "../components/CustomSelect";
import { useStaffSearch } from "../hooks/useStaffSearch";
import DiscordAvatar from "../components/DiscordAvatar";
import DiscordIdentity from "../components/DiscordIdentity";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import Avatar from "../components/Avatar";
import Card from "../components/primitives/Card";
import PageShell from "../components/primitives/PageShell";
import Banner from "../components/primitives/Banner";
import { useApiQuery } from "../hooks/useApiQuery";
import { expiresLabel } from "../utils";

export default function InternalAffairs() {
  const { user } = useAuth();
  const canAccess = user?.tier === "ia" || user?.tier === "management" || user?.tier === "director";

  // ---------- Kick Rejoin Cooldowns ----------
  const [removingId, setRemovingId] = useState(null);

  const cooldownsQuery = useApiQuery(["punishments", "kick-cooldowns"], canAccess && "/punishments/kick-cooldowns/active", {
    refetchInterval: 15_000,
    select: d => d.cooldowns,
  });
  const cooldowns = cooldownsQuery.data ?? [];

  async function removeCooldown(id, label) {
    if (!confirm(`Remove ${label}'s rejoin cooldown early? They'll be able to rejoin normally right away.`)) return;
    setRemovingId(id);
    try {
      await apiFetch(`/punishments/kick-cooldowns/${id}`, { method: "DELETE" });
      await cooldownsQuery.refetch();
    } catch (err) {
      alert(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  // ---------- Issue Strike ----------
  const strikeSearch = useStaffSearch();
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeError, setStrikeError] = useState(null);
  const [strikeSuccess, setStrikeSuccess] = useState(false);
  const [strikeSubmitting, setStrikeSubmitting] = useState(false);

  // ---------- Suggest Promotion/Demotion ----------
  const promoSearch = useStaffSearch();
  const [promoAction, setPromoAction] = useState("promote");
  const [rankOptions, setRankOptions] = useState([]);
  const [suggestedRank, setSuggestedRank] = useState("");
  const [promoReason, setPromoReason] = useState("");
  const [promoError, setPromoError] = useState(null);
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  // Fetch valid ranks ONLY once a target is picked -- the list itself
  // depends on both who's suggesting and who the target is (below the
  // suggester's own rank, above the target's current rank).
  useEffect(() => {
    if (!promoSearch.target) {
      setRankOptions([]);
      setSuggestedRank("");
      return;
    }
    apiFetch(`/rank-changes/ranks?targetId=${promoSearch.target.discordId}&action=${promoAction}`).then(({ ranks }) => {
      setRankOptions(ranks);
      setSuggestedRank(ranks[0]?.value ?? "");
    }).catch(() => setRankOptions([]));
  }, [promoSearch.target, promoAction]);

  async function submitStrike(e) {
    e.preventDefault();
    setStrikeError(null);
    setStrikeSuccess(false);
    if (!strikeSearch.target) {
      setStrikeError("Pick a staff member from the search results first.");
      return;
    }
    setStrikeSubmitting(true);
    try {
      await apiFetch("/strikes", { method: "POST", body: { discordId: strikeSearch.target.discordId, reason: strikeReason } });
      setStrikeSuccess(true);
      strikeSearch.reset();
      setStrikeReason("");
    } catch (err) {
      setStrikeError(err.message);
    } finally {
      setStrikeSubmitting(false);
    }
  }

  async function submitPromotion(e) {
    e.preventDefault();
    setPromoError(null);
    setPromoSuccess(false);
    if (!promoSearch.target) {
      setPromoError("Pick a staff member from the search results first.");
      return;
    }
    if (!suggestedRank) {
      setPromoError("No valid rank to suggest for this person. They may already outrank what you're allowed to suggest.");
      return;
    }
    setPromoSubmitting(true);
    try {
      await apiFetch("/rank-changes", {
        method: "POST",
        body: { action: promoAction, targetDiscordId: promoSearch.target.discordId, newRank: suggestedRank, reason: promoReason },
      });
      setPromoSuccess(true);
      promoSearch.reset();
      setPromoReason("");
    } catch (err) {
      setPromoError(err.message);
    } finally {
      setPromoSubmitting(false);
    }
  }

  if (!canAccess) {
    return (
      <PageShell title="Internal Affairs">
        <Banner>You need Internal Affairs access to view this page.</Banner>
      </PageShell>
    );
  }

  return (
    <PageShell title="Internal Affairs" subtitle="Issue strikes and suggest promotions. Need backup right now? Use Request Staff from the Dashboard.">
      <div className="card-grid">
        <Card>
          <h2>Issue a Strike</h2>
          <p className="muted card-subtitle">Every strike automatically expires after 2 weeks.</p>
          {strikeError && <Banner>{strikeError}</Banner>}
          {strikeSuccess && <Banner variant="success">Strike issued.</Banner>}
          <form onSubmit={submitStrike}>
            <label>Staff Member</label>
            <div className="autocomplete-wrap">
              <input
                ref={strikeSearch.inputRef}
                required
                autoComplete="off"
                value={strikeSearch.query}
                onChange={e => strikeSearch.onQueryChange(e.target.value)}
                onFocus={() => strikeSearch.suggestions.length > 0 && strikeSearch.setShowSuggestions(true)}
                placeholder="Search by username or nickname"
              />
              <PortalDropdown anchorRef={strikeSearch.inputRef} open={strikeSearch.showSuggestions} onClose={() => strikeSearch.setShowSuggestions(false)} className="autocomplete-list-portal">
                {strikeSearch.suggestions.map(s => (
                  <div key={s.discordId} className="autocomplete-item" onClick={() => strikeSearch.pick(s)}>
                    <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={26} />
                    <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                  </div>
                ))}
              </PortalDropdown>
            </div>
            <label>Reason</label>
            <AutoGrowTextarea required value={strikeReason} onChange={e => setStrikeReason(e.target.value)} />
            <button className="primary" type="submit" disabled={strikeSubmitting}>{strikeSubmitting ? "Issuing…" : "Issue Strike"}</button>
          </form>
        </Card>

        <Card>
          <h2>Suggest a Rank Change</h2>
          <p className="muted card-subtitle">Goes to Management+ for approval.</p>
          {promoError && <Banner>{promoError}</Banner>}
          {promoSuccess && <Banner variant="success">Submitted.</Banner>}
          <form onSubmit={submitPromotion}>
            <label>Action</label>
            <CustomSelect
              value={promoAction}
              onChange={setPromoAction}
              options={[{ value: "promote", label: "Promote" }, { value: "demote", label: "Demote" }]}
            />
            <label style={{ marginTop: 12 }}>Staff Member</label>
            <div className="autocomplete-wrap">
              <input
                ref={promoSearch.inputRef}
                required
                autoComplete="off"
                value={promoSearch.query}
                onChange={e => promoSearch.onQueryChange(e.target.value)}
                onFocus={() => promoSearch.suggestions.length > 0 && promoSearch.setShowSuggestions(true)}
                placeholder="Search by username or nickname"
              />
              <PortalDropdown anchorRef={promoSearch.inputRef} open={promoSearch.showSuggestions} onClose={() => promoSearch.setShowSuggestions(false)} className="autocomplete-list-portal">
                {promoSearch.suggestions.map(s => (
                  <div key={s.discordId} className="autocomplete-item" onClick={() => promoSearch.pick(s)}>
                    <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={26} />
                    <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                  </div>
                ))}
              </PortalDropdown>
            </div>

            {promoSearch.target && (
              <p className="muted field-hint">Current rank: {promoSearch.target.rankLabel ?? "Unknown"}</p>
            )}

            <label>New Rank</label>
            {rankOptions.length > 0 ? (
              <CustomSelect value={suggestedRank} onChange={setSuggestedRank} options={rankOptions} />
            ) : (
              <p className="muted field-hint">
                {promoSearch.target ? "No valid rank available for this action." : "Pick a staff member first."}
              </p>
            )}

            <label style={{ marginTop: 12 }}>Reason</label>
            <AutoGrowTextarea required value={promoReason} onChange={e => setPromoReason(e.target.value)} />
            <button className="primary" type="submit" disabled={promoSubmitting || rankOptions.length === 0}>{promoSubmitting ? "Submitting…" : "Submit for Approval"}</button>
          </form>
        </Card>
      </div>

      <Card style={{ marginTop: 20 }}>
        <h2>Active Kick Rejoin Cooldowns ({cooldowns.length})</h2>
        <p className="muted card-subtitle">Everyone currently on a rejoin cooldown from a logged kick -- started automatically from the Dashboard's kick log.</p>
        {cooldownsQuery.isLoading && <p className="muted">Loading…</p>}
        {!cooldownsQuery.isLoading && cooldowns.length === 0 && <p className="muted">Nobody is currently on a rejoin cooldown.</p>}
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
                    <div className="log-card-field"><span className="muted">Automatically re-kicked:</span> {c.rekick_count} time{c.rekick_count === 1 ? "" : "s"}</div>
                  )}
                  <div className="button-row" style={{ marginTop: 8 }}>
                    <button
                      className="btn-red small"
                      disabled={removingId === c.id}
                      onClick={() => removeCooldown(c.id, c.roblox_username)}
                    >
                      {removingId === c.id ? "Removing…" : "Remove Cooldown"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
