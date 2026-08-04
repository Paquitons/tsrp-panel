import { useRef, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { useStaffSearch } from "../hooks/useStaffSearch";
import DiscordAvatar from "../components/DiscordAvatar";
import Avatar from "../components/Avatar";
import PortalDropdown from "../components/PortalDropdown";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import RobloxLinkModal from "../components/RobloxLinkModal";

const ACTION_LABELS = { link: "Linked", change: "Changed", unlink: "Unlinked" };

function UnlinkModal({ discordId, onClose, onUnlinked }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/verification/unlink", { method: "POST", body: { discordId, reason: reason || undefined } });
      onUnlinked();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Unlink Roblox Account</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <label>Reason (optional)</label>
          <AutoGrowTextarea value={reason} onChange={e => setReason(e.target.value)} />
          <div className="button-row">
            <button className="danger" type="submit" disabled={submitting}>{submitting ? "Unlinking…" : "Confirm Unlink"}</button>
            <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Verification() {
  const { user } = useAuth();
  const canAccess = !!user?.isManagementOrAbove;
  const search = useStaffSearch("/verification/members", "members");

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);

  async function loadProfile(discordId) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/verification/${discordId}`);
      setProfile(data);
    } catch (err) {
      setError(err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  function pickMember(member) {
    search.pick(member);
    loadProfile(member.discordId);
  }

  function refresh() {
    if (profile) loadProfile(profile.discordId);
  }

  if (!canAccess) {
    return (
      <div className="content">
        <div className="page-header"><h1>Account Verification</h1></div>
        <div className="error-banner">You need Management+ access to view this page.</div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-header">
        <h1>Account Verification</h1>
        <p className="muted">Manually link, change, or unlink a Discord member's Roblox account for people Bloxlink can't verify.</p>
      </div>

      <div className="card">
        <h2>Find a Discord User</h2>
        <div className="autocomplete-wrap">
          <input
            ref={search.inputRef}
            autoComplete="off"
            value={search.query}
            onChange={e => search.onQueryChange(e.target.value)}
            onFocus={() => search.suggestions.length > 0 && search.setShowSuggestions(true)}
            placeholder="Search by username or nickname"
          />
          <PortalDropdown anchorRef={search.inputRef} open={search.showSuggestions} onClose={() => search.setShowSuggestions(false)} className="autocomplete-list-portal">
            {search.suggestions.map(s => (
              <div key={s.discordId} className="autocomplete-item" onClick={() => pickMember(s)}>
                <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={26} />
                <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                {s.nickname && <span className="autocomplete-hint">@{s.username}</span>}
              </div>
            ))}
          </PortalDropdown>
        </div>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error-banner">{error}</div>}

      {profile && (
        <>
          <div className="card">
            <h2>Discord Account</h2>
            <div className="verification-identity-row">
              <DiscordAvatar discordId={profile.discordId} avatarHash={profile.avatarHash} size={48} />
              <div>
                <div className="verification-identity-name">{profile.nickname ?? profile.username}</div>
                <div className="muted">@{profile.username} &middot; {profile.discordId}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="modal-title-row" style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Roblox Link</h2>
              <span className={`badge ${profile.link ? "loa-status-approved" : "loa-status-denied"}`}>
                {profile.link ? profile.link.source : "Not Linked"}
              </span>
            </div>

            {profile.link ? (
              <div className="verification-identity-row">
                <Avatar robloxId={profile.link.robloxId} username={profile.link.robloxUsername} size={48} />
                <div>
                  <div className="verification-identity-name">{profile.link.robloxUsername ?? "Unknown username"}</div>
                  <div className="muted">Roblox ID {profile.link.robloxId}</div>
                  <div className="muted">
                    Linked {new Date(profile.link.linkedAt).toLocaleString()}
                    {profile.link.linkedBy && (
                      <>
                        {" "}by <DiscordAvatar discordId={profile.link.linkedBy} avatarHash={profile.link.linkedBy_avatar_hash} size={16} style={{ verticalAlign: "middle", margin: "0 4px" }} />
                        {profile.link.linkedBy_username ?? profile.link.linkedBy}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">This account has no linked Roblox account.</p>
            )}

            <div className="button-row" style={{ marginTop: 16 }}>
              <button className="primary" onClick={() => setLinkModalOpen(true)}>
                {profile.link ? "Change Roblox Account" : "Link Roblox Account"}
              </button>
              {profile.link && (
                <button className="danger" onClick={() => setUnlinkModalOpen(true)}>Unlink</button>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Link History</h2>
            {profile.history.length === 0 ? (
              <p className="muted">No changes recorded yet.</p>
            ) : (
              <div className="loa-list">
                {profile.history.map(h => (
                  <div className="loa-card" key={h.id}>
                    <div className="loa-card-top loa-card-top-stack">
                      <span className="badge loa-status-pending">{ACTION_LABELS[h.action] ?? h.action}</span>
                      <span className="muted">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    <div className="log-card-field">
                      <span className="muted">Change:</span>{" "}
                      {h.previous_roblox_username ?? h.previous_roblox_id ?? "(none)"} &rarr; {h.new_roblox_username ?? h.new_roblox_id ?? "(none)"}
                    </div>
                    <div className="log-card-field">
                      <span className="muted">By:</span> <DiscordAvatar discordId={h.performed_by} avatarHash={h.performed_by_avatar_hash} size={16} style={{ verticalAlign: "middle", margin: "0 4px" }} />{h.performed_by_username ?? h.performed_by}
                    </div>
                    {h.reason && <div className="log-card-field"><span className="muted">Reason:</span> {h.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {linkModalOpen && profile && (
        <RobloxLinkModal
          discordId={profile.discordId}
          currentlyLinked={!!profile.link}
          onClose={() => setLinkModalOpen(false)}
          onLinked={() => { setLinkModalOpen(false); refresh(); }}
        />
      )}

      {unlinkModalOpen && profile && (
        <UnlinkModal
          discordId={profile.discordId}
          onClose={() => setUnlinkModalOpen(false)}
          onUnlinked={() => { setUnlinkModalOpen(false); refresh(); }}
        />
      )}
    </div>
  );
}
