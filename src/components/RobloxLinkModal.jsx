import { useRef, useState } from "react";
import { apiFetch } from "../api";
import PortalDropdown from "./PortalDropdown";
import AutoGrowTextarea from "./AutoGrowTextarea";

export default function RobloxLinkModal({ discordId, currentlyLinked, onClose, onLinked }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [profile, setProfile] = useState(null);
  const [reason, setReason] = useState("");
  const [conflicts, setConflicts] = useState(null);
  const [error, setError] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  function onQueryChange(value) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { results } = await apiFetch(`/verification/roblox-search?q=${encodeURIComponent(value.trim())}`);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch { setSuggestions([]); }
    }, 300);
  }

  async function loadProfile(idOrUsername) {
    setError(null);
    setShowSuggestions(false);
    setLoadingProfile(true);
    try {
      const { profile } = await apiFetch(`/verification/roblox-profile/${encodeURIComponent(idOrUsername)}`);
      setProfile(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingProfile(false);
    }
  }

  function submitLookup(e) {
    e.preventDefault();
    if (!query.trim()) return;
    loadProfile(query.trim());
  }

  async function confirmLink(confirmOverride = false) {
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/verification/link", {
        method: "POST",
        body: { discordId, robloxId: profile.id, reason: reason || undefined, confirmOverride },
      });
      onLinked();
    } catch (err) {
      if (err.conflicts) {
        setConflicts(err.conflicts);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{currentlyLinked ? "Change Roblox Account" : "Link Roblox Account"}</h2>

        {error && <div className="error-banner">{error}</div>}

        {!profile && (
          <form onSubmit={submitLookup}>
            <label>Roblox Username or User ID</label>
            <div className="autocomplete-wrap">
              <input
                ref={inputRef}
                required
                autoFocus
                autoComplete="off"
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="e.g. builderman or 156"
              />
              <PortalDropdown anchorRef={inputRef} open={showSuggestions} onClose={() => setShowSuggestions(false)} className="autocomplete-list-portal">
                {suggestions.map(s => (
                  <div key={s.id} className="autocomplete-item" onClick={() => loadProfile(String(s.id))}>
                    <span className="autocomplete-name">{s.name}</span>
                    <span className="autocomplete-hint">{s.displayName}</span>
                  </div>
                ))}
              </PortalDropdown>
            </div>
            <div className="button-row">
              <button className="primary" type="submit" disabled={loadingProfile}>{loadingProfile ? "Looking up…" : "Look Up"}</button>
              <button className="secondary" type="button" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}

        {profile && !conflicts && (
          <>
            <div className="roblox-confirm-card">
              <img src={profile.avatarUrl} alt="" className="roblox-confirm-avatar" />
              <div className="roblox-confirm-info">
                <div className="roblox-confirm-name">
                  {profile.displayName}
                  {profile.hasVerifiedBadge && <span className="roblox-verified-badge" title="Verified account">✓</span>}
                </div>
                <div className="muted">@{profile.name} &middot; ID {profile.id}</div>
                <div className="muted">Created {new Date(profile.created).toLocaleDateString()}</div>
                {profile.isBanned && <div className="error-banner" style={{ marginTop: 8 }}>This account is currently banned/terminated on Roblox.</div>}
              </div>
            </div>

            <label style={{ marginTop: 16 }}>Reason (optional)</label>
            <AutoGrowTextarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this is being linked manually" />

            <div className="button-row">
              <button className="primary" type="button" disabled={submitting} onClick={() => confirmLink(false)}>
                {submitting ? "Saving…" : "Confirm & Link"}
              </button>
              <button className="secondary" type="button" onClick={() => setProfile(null)}>Back</button>
            </div>
          </>
        )}

        {conflicts && (
          <>
            <div className="error-banner">
              <strong>Before you continue:</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {conflicts.map((c, i) => <li key={i}>{c.message}</li>)}
              </ul>
            </div>
            <div className="button-row">
              <button className="danger" type="button" disabled={submitting} onClick={() => confirmLink(true)}>
                {submitting ? "Saving…" : "Proceed Anyway"}
              </button>
              <button className="secondary" type="button" onClick={() => setConflicts(null)}>Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
