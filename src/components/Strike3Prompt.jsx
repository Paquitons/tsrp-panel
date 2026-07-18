import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../utils";
import DiscordAvatar from "./DiscordAvatar";
import CustomSelect from "./CustomSelect";

const POLL_MS = 3_000;

/**
 * Mirrors the Discord bot's own "3rd strike -- Director+ must decide"
 * card, but on the panel: automatically pops up (no close button, no
 * backdrop-click-to-dismiss -- Dismiss is itself one of the three real
 * choices) the instant a Chief of Staff+ user has one pending, and stays
 * in sync with Discord since both read/write the same strike3_prompts
 * row. Mounted once at the app shell level so it can surface regardless
 * of which page is currently open.
 */
export default function Strike3Prompt() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState([]);
  const [view, setView] = useState("summary"); // "summary" | "demote" | "terminate"
  const [rankOptions, setRankOptions] = useState([]);
  const [newRank, setNewRank] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    try {
      const { prompts } = await apiFetch("/strike-actions/pending");
      setPrompts(prompts);
    } catch { /* not Chief of Staff+, or a transient network hiccup -- either way, just don't show anything */ }
  }

  useEffect(() => {
    if (!user?.canReviewBigActions) return;
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [user?.canReviewBigActions]);

  const prompt = prompts[0] ?? null;

  // Reset back to the summary view whenever the active prompt changes --
  // either this one got resolved and a different one took its place, or
  // it disappeared entirely (someone else resolved it first).
  useEffect(() => {
    setView("summary");
    setRankOptions([]);
    setNewRank("");
    setReason("");
    setError(null);
  }, [prompt?.id]);

  useEffect(() => {
    if (view !== "demote" || !prompt) return;
    apiFetch(`/rank-changes/ranks?targetId=${prompt.discord_id}&action=demote`).then(({ ranks }) => {
      setRankOptions(ranks);
      setNewRank(ranks[0]?.value ?? "");
    }).catch(() => setRankOptions([]));
  }, [view, prompt?.discord_id]);

  if (!user?.canReviewBigActions || !prompt) return null;

  async function dismiss() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/strike-actions/${prompt.id}/dismiss`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function terminate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/strike-actions/${prompt.id}/terminate`, { method: "POST", body: { reason: reason || undefined } });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function demote(e) {
    e.preventDefault();
    if (!newRank) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/strike-actions/${prompt.id}/demote`, { method: "POST", body: { newRank, reason: reason || undefined } });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal strike3-modal">
        <div className="modal-title-row">
          <h2>🚨 3rd Strike — Action Required</h2>
        </div>
        <p className="modal-subheading">
          {prompts.length > 1
            ? `${prompts.length} staff members need a decision. Showing the oldest first.`
            : "This staff member has 3 active strikes and needs a decision."}
        </p>

        <div className="user-panel-identity" style={{ marginBottom: 16 }}>
          <DiscordAvatar discordId={prompt.discord_id} avatarHash={prompt.target_avatar_hash} size={48} />
          <div>
            <div className="log-card-username" style={{ fontSize: 17 }}>{prompt.target_username ?? prompt.discord_id}</div>
            <div className="muted">Triggered {timeAgo(prompt.created_at)}</div>
          </div>
        </div>

        <div className="log-card-field" style={{ marginBottom: 12 }}>
          <span className="muted">Triggering Reason:</span> {prompt.reason}
        </div>

        <h3 className="modal-subheading">Strike History</h3>
        <div className="log-card-list" style={{ marginBottom: 16 }}>
          {prompt.history.map(s => (
            <div key={s.id} className="log-card-field strike3-history-row">
              <span>
                <span className="muted">Strike {s.role_slot}:</span> {s.reason}
                {s.removed_at && <span className="muted"> (removed{s.removed_reason ? `: ${s.removed_reason}` : ""})</span>}
              </span>
              <span className="muted">{timeAgo(s.created_at)}</span>
            </div>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {view === "summary" && (
          <div className="button-row">
            <button className="btn-red" disabled={submitting} onClick={() => setView("terminate")}>Terminate</button>
            <button className="btn-orange" disabled={submitting} onClick={() => setView("demote")}>Demote</button>
            <button className="secondary" disabled={submitting} onClick={dismiss}>{submitting ? "Dismissing…" : "Dismiss"}</button>
          </div>
        )}

        {view === "terminate" && (
          <form onSubmit={terminate}>
            <label>Reason</label>
            <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder={`Defaults to "3rd strike: ${prompt.reason}"`} />
            <div className="button-row">
              <button className="btn-red" type="submit" disabled={submitting}>{submitting ? "Terminating…" : "Confirm Termination"}</button>
              <button className="secondary" type="button" disabled={submitting} onClick={() => setView("summary")}>Back</button>
            </div>
          </form>
        )}

        {view === "demote" && (
          <form onSubmit={demote}>
            <label>New Rank</label>
            {rankOptions.length > 0 ? (
              <CustomSelect value={newRank} onChange={setNewRank} options={rankOptions} />
            ) : (
              <p className="muted">Loading valid ranks…</p>
            )}
            <label>Reason</label>
            <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder={`Defaults to "3rd strike: ${prompt.reason}"`} />
            <div className="button-row">
              <button className="btn-orange" type="submit" disabled={submitting || !newRank}>{submitting ? "Demoting…" : "Confirm Demotion"}</button>
              <button className="secondary" type="button" disabled={submitting} onClick={() => setView("summary")}>Back</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
