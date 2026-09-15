import { Fragment, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import DiscordAvatar from "../components/DiscordAvatar";
import DiscordIdentity from "../components/DiscordIdentity";
import AccountPicker from "../components/AccountPicker";
import Avatar from "../components/Avatar";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import RobloxLinkModal from "../components/RobloxLinkModal";
import Modal from "../components/primitives/Modal";
import Banner from "../components/primitives/Banner";
import Card from "../components/primitives/Card";
import PageShell from "../components/primitives/PageShell";
import AsyncBoundary from "../components/primitives/AsyncBoundary";
import { useApiQuery } from "../hooks/useApiQuery";

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
    <Modal onClose={onClose} labelledBy="unlink-modal-title">
        <h2 id="unlink-modal-title">Unlink Roblox Account</h2>
        {error && <Banner>{error}</Banner>}
        <form onSubmit={submit}>
          <label>Reason (optional)</label>
          <AutoGrowTextarea value={reason} onChange={e => setReason(e.target.value)} />
          <div className="button-row">
            <button className="danger" type="submit" disabled={submitting}>{submitting ? "Unlinking…" : "Confirm Unlink"}</button>
            <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
    </Modal>
  );
}

/**
 * Releasing is not unlinking.
 *
 * Unlink throws the record away, which is right when a link was simply
 * wrong. Release keeps it -- the record still identifies who held that
 * Roblox account, so every audit that resolves through it still works --
 * and only stops it blocking another Discord account from verifying onto
 * the same Roblox account.
 *
 * This is the tool for somebody who lost their Discord account but is
 * still in the server: hacked, or locked out. An account that has already
 * LEFT is released automatically and needs nobody to come here.
 */
function ReleaseModal({ discordId, robloxUsername, onClose, onReleased }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/verification/release", { method: "POST", body: { discordId, reason } });
      onReleased();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="release-modal-title">
      <h2 id="release-modal-title">Release Roblox Claim</h2>
      {error && <Banner>{error}</Banner>}
      <p className="muted">
        Frees <strong>{robloxUsername ?? "this Roblox account"}</strong> so its owner can verify it on a
        different Discord account. Nothing is deleted and this record stays exactly as it is.
      </p>
      <p className="muted">
        Verifying still means completing Roblox sign-in, so this hands nobody anything they could not
        already prove they own. Rejoining the server does not undo a release made here.
      </p>
      <form onSubmit={submit}>
        <label>Reason</label>
        <AutoGrowTextarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Why the claim is being lifted. At least 10 characters."
        />
        <div className="button-row">
          <button className="primary" type="submit" disabled={submitting || reason.trim().length < 10}>
            {submitting ? "Releasing…" : "Release Claim"}
          </button>
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

/** @param {boolean} embedded Rendered as a Management tab, so no page chrome. */
export default function Verification({ embedded = false }) {
  const { user } = useAuth();
  const canAccess = !!user?.isManagementOrAbove;

  const [selectedDiscordId, setSelectedDiscordId] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);

  const query = useApiQuery(["verification", selectedDiscordId], selectedDiscordId && `/verification/${selectedDiscordId}`);
  const profile = query.data;

  function pickMember(member) {
    setSelectedDiscordId(member.discordId);
  }

  if (!canAccess) {
    const denied = <Banner>You need Management access or above to view this.</Banner>;
    return embedded ? denied : <PageShell title="Account Verification">{denied}</PageShell>;
  }

  const Wrapper = embedded ? Fragment : PageShell;
  const wrapperProps = embedded ? {} : {
    title: "Account Verification",
    subtitle: "Manually link, change, or unlink a Discord member's Roblox account for people Bloxlink cannot verify.",
  };

  return (
    <Wrapper {...wrapperProps}>
      <Card>
        <h2>Find a Discord User</h2>
        <AccountPicker endpoint="/verification/members" onSelect={pickMember} />
      </Card>

      {selectedDiscordId && (
        <AsyncBoundary query={query}>
          {() => (
          <>
            <Card>
              <h2>Discord Account</h2>
              <div className="verification-identity-row">
                <DiscordAvatar discordId={profile.discordId} avatarHash={profile.avatarHash} size={48} />
                <div>
                  <div className="verification-identity-name">{profile.nickname ?? profile.username}</div>
                  <div className="muted">@{profile.username} &middot; {profile.discordId}</div>
                </div>
              </div>
            </Card>

            <Card>
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
                          {" "}by{" "}
                          <DiscordIdentity
                            nickname={profile.link.linkedBy_nickname} username={profile.link.linkedBy_username}
                            discordId={profile.link.linkedBy} avatarHash={profile.link.linkedBy_avatar_hash} size={16}
                            showId={false}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted">This account has no linked Roblox account.</p>
              )}

              {profile.claim?.released && (
                <Banner variant="info" style={{ marginTop: 12 }}>
                  This claim is released, so somebody else can verify this Roblox account.
                  {profile.claim.releasedBy ? " Released by management." : " Released automatically when this account left the server."}
                  {profile.claim.releasedReason ? ` Reason: ${profile.claim.releasedReason}` : ""}
                </Banner>
              )}

              {profile.inServer === false && (
                <Banner variant="warning" style={{ marginTop: 12 }}>
                  This Discord account is no longer in the server.
                </Banner>
              )}

              <div className="button-row" style={{ marginTop: 16 }}>
                <button className="primary" onClick={() => setLinkModalOpen(true)}>
                  {profile.link ? "Change Roblox Account" : "Link Roblox Account"}
                </button>
                {profile.link && !profile.claim?.released && (
                  <button className="secondary" onClick={() => setReleaseModalOpen(true)}>Release Claim</button>
                )}
                {profile.link && (
                  <button className="danger" onClick={() => setUnlinkModalOpen(true)}>Unlink</button>
                )}
              </div>
            </Card>

            <Card>
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
                        <span className="muted">By:</span>{" "}
                        <DiscordIdentity
                          nickname={h.performed_by_nickname} username={h.performed_by_username}
                          discordId={h.performed_by} avatarHash={h.performed_by_avatar_hash} size={16}
                          showId={false}
                        />
                      </div>
                      {h.reason && <div className="log-card-field"><span className="muted">Reason:</span> {h.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
          )}
        </AsyncBoundary>
      )}

      {linkModalOpen && profile && (
        <RobloxLinkModal
          discordId={profile.discordId}
          currentlyLinked={!!profile.link}
          onClose={() => setLinkModalOpen(false)}
          onLinked={() => { setLinkModalOpen(false); query.refetch(); }}
        />
      )}

      {releaseModalOpen && profile && (
        <ReleaseModal
          discordId={profile.discordId}
          robloxUsername={profile.link?.robloxUsername}
          onClose={() => setReleaseModalOpen(false)}
          onReleased={() => { setReleaseModalOpen(false); query.refetch(); }}
        />
      )}

      {unlinkModalOpen && profile && (
        <UnlinkModal
          discordId={profile.discordId}
          onClose={() => setUnlinkModalOpen(false)}
          onUnlinked={() => { setUnlinkModalOpen(false); query.refetch(); }}
        />
      )}
    </Wrapper>
  );
}
