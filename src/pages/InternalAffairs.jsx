import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { discordAvatarUrl } from "../utils";
import PortalDropdown from "../components/PortalDropdown";
import CustomSelect from "../components/CustomSelect";
import { useStaffSearch } from "../hooks/useStaffSearch";

export default function InternalAffairs() {
  const { user } = useAuth();
  const canAccess = user?.tier === "ia" || user?.tier === "management" || user?.tier === "director";

  // ---------- Issue Strike ----------
  const strikeSearch = useStaffSearch();
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeError, setStrikeError] = useState(null);
  const [strikeSuccess, setStrikeSuccess] = useState(false);
  const [strikeSubmitting, setStrikeSubmitting] = useState(false);

  // ---------- Suggest Promotion ----------
  const promoSearch = useStaffSearch();
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
    apiFetch(`/promotions/ranks?targetId=${promoSearch.target.discordId}`).then(({ ranks }) => {
      setRankOptions(ranks);
      setSuggestedRank(ranks[0]?.value ?? "");
    }).catch(() => setRankOptions([]));
  }, [promoSearch.target]);

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
      setPromoError("No valid rank to suggest for this person -- they may already outrank what you're allowed to suggest.");
      return;
    }
    setPromoSubmitting(true);
    try {
      await apiFetch("/promotions/suggest", {
        method: "POST",
        body: { discordId: promoSearch.target.discordId, suggestedRank, reason: promoReason },
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
      <div className="content">
        <div className="page-header"><h1>Internal Affairs</h1></div>
        <div className="error-banner">You need Internal Affairs access to view this page.</div>
      </div>
    );
  }

  return (
    <div className="content dashboard-content">
      <div className="page-header">
        <h1>Internal Affairs</h1>
        <p className="muted">Issue strikes and suggest promotions.</p>
      </div>

      <div className="multi-col-grid">
        <div className="dashboard-col">
          <div className="card">
            <h2>Issue a Strike</h2>
            <p className="muted" style={{ marginTop: -8 }}>Every strike automatically expires after 2 weeks.</p>
            {strikeError && <div className="error-banner">{strikeError}</div>}
            {strikeSuccess && <div className="success-banner">Strike issued.</div>}
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
                      <img className="avatar-img" style={{ width: 26, height: 26 }} src={discordAvatarUrl(s.discordId, s.avatarHash)} alt="" />
                      <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                    </div>
                  ))}
                </PortalDropdown>
              </div>
              <label>Reason</label>
              <textarea rows={2} required value={strikeReason} onChange={e => setStrikeReason(e.target.value)} />
              <button className="primary" type="submit" disabled={strikeSubmitting}>{strikeSubmitting ? "Issuing…" : "Issue Strike"}</button>
            </form>
          </div>
        </div>

        <div className="dashboard-col">
          <div className="card">
            <h2>Suggest a Promotion</h2>
            {promoError && <div className="error-banner">{promoError}</div>}
            {promoSuccess && <div className="success-banner">Suggestion submitted.</div>}
            <form onSubmit={submitPromotion}>
              <label>Staff Member</label>
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
                      <img className="avatar-img" style={{ width: 26, height: 26 }} src={discordAvatarUrl(s.discordId, s.avatarHash)} alt="" />
                      <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                    </div>
                  ))}
                </PortalDropdown>
              </div>

              {promoSearch.target && (
                <p className="muted" style={{ marginTop: -6 }}>Current rank: {promoSearch.target.rank ?? "Unknown"}</p>
              )}

              <label>Suggested Rank</label>
              {rankOptions.length > 0 ? (
                <CustomSelect value={suggestedRank} onChange={setSuggestedRank} options={rankOptions} />
              ) : (
                <p className="muted" style={{ marginTop: -6 }}>
                  {promoSearch.target ? "No valid rank available -- they may already outrank what you can suggest." : "Pick a staff member first."}
                </p>
              )}

              <label style={{ marginTop: 12 }}>Reason</label>
              <textarea rows={2} required value={promoReason} onChange={e => setPromoReason(e.target.value)} />
              <button className="primary" type="submit" disabled={promoSubmitting || rankOptions.length === 0}>{promoSubmitting ? "Submitting…" : "Suggest Promotion"}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
