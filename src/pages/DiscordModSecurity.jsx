import { useState } from "react";
import { apiFetch } from "../api";
import DiscordIdentity from "../components/DiscordIdentity";
import Modal from "../components/primitives/Modal";
import Banner from "../components/primitives/Banner";
import { usePolling } from "../hooks/usePolling";

const ADMIN_POLL_MS = 15_000;

const SEVERITY_LABEL = { flag: "Flagged", high_risk: "High-Risk", critical: "Critical" };
const SEVERITY_CLASS = { flag: "positive", high_risk: "", critical: "negative" };
const STATUS_LABEL = { open: "Open", escalated: "Escalated -- Needs Review", reviewed: "Reviewed", dismissed: "Dismissed" };

function NamedHolder({ discordId, prefix, row }) {
  return (
    <DiscordIdentity
      variant="row"
      nickname={row[`${prefix}_nickname`]} username={row[`${prefix}_username`]}
      discordId={discordId} avatarHash={row[`${prefix}_avatar_hash`]} size={22}
      showId={false}
    />
  );
}

// ==================================================================
// Discord Mod Security -- the dedicated log surface for
// highrock-bot's discordModSecurity.js. Read-only detection/detail view;
// acting on a flag (restoring auto-removed roles) happens via the bot's
// own /modsecurity restore command, matching this system's "detect and
// alert, don't over-automate" philosophy -- the panel exists so
// management can see exactly what was detected, by whom, and why,
// without needing to scroll Discord's channel history for it.
// ==================================================================
export default function DiscordModSecurity() {
  const [flags, setFlags] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [selectedFlagId, setSelectedFlagId] = useState(null);

  function load() {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    apiFetch(`/super-admin/discord-mod-security/flags${qs}`)
      .then(({ flags }) => { setFlags(flags); setError(null); })
      .catch(err => setError(err.message));
  }
  usePolling(load, ADMIN_POLL_MS, [statusFilter]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  return (
    <>
      <p className="muted card-subtitle" style={{ marginTop: 16 }}>
        Bursts of Discord moderation activity (bans, kicks, timeouts, role changes, channel destruction) detected
        from Discord's own audit log -- a second, independent layer alongside the ERLC-side Anti-Mod-Abuse system.
        Detection thresholds, exemptions, and automatic responses are configured under Bot Settings &rarr;
        Discord Mod Security. An automatic role removal is always reversible via the bot's{" "}
        <code>/modsecurity restore</code> command.
      </p>
      {error && <Banner>{error}</Banner>}
      {notice && <Banner variant="success">{notice}</Banner>}

      <div className="button-row" style={{ marginTop: 12, marginBottom: 12 }}>
        {["", "open", "escalated", "reviewed", "dismissed"].map(s => (
          <button
            key={s || "all"}
            type="button"
            className={statusFilter === s ? "primary" : "secondary"}
            onClick={() => setStatusFilter(s)}
          >
            {s ? STATUS_LABEL[s] : "All"}
          </button>
        ))}
      </div>

      <div className="loa-list">
        {flags.map(flag => (
          <div className="loa-card loa-card-row" key={flag.id} style={{ cursor: "pointer" }} onClick={() => setSelectedFlagId(flag.id)}>
            <span className={`board-value ${SEVERITY_CLASS[flag.severity] ?? ""}`} style={{ minWidth: 90 }}>{SEVERITY_LABEL[flag.severity] ?? flag.severity}</span>
            <NamedHolder discordId={flag.executor_discord_id} prefix="moderator" row={flag} />
            <span className="muted" style={{ marginLeft: 8 }}>{flag.rule_id}</span>
            <span className="muted" style={{ marginLeft: "auto" }}>
              {flag.action_count} action(s) over {flag.window_seconds}s &middot; {STATUS_LABEL[flag.status] ?? flag.status}
            </span>
          </div>
        ))}
        {flags.length === 0 && <p className="muted">No flags{statusFilter ? ` with status "${STATUS_LABEL[statusFilter]}"` : ""}.</p>}
      </div>

      {selectedFlagId && (
        <FlagDetailModal
          flagId={selectedFlagId}
          onClose={() => setSelectedFlagId(null)}
          onChanged={() => { flash("Flag updated."); load(); }}
        />
      )}
    </>
  );
}

function FlagDetailModal({ flagId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  usePolling(
    () => apiFetch(`/super-admin/discord-mod-security/flags/${flagId}/actions`).then(d => { setData(d); setError(null); }).catch(err => setError(err.message)),
    ADMIN_POLL_MS,
    [flagId]
  );

  async function setStatus(status) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/super-admin/discord-mod-security/flags/${flagId}`, { method: "PATCH", body: { status, resolutionNote: note || undefined } });
      onChanged();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="mod-security-flag-title">
      <h2 id="mod-security-flag-title">Flag #{flagId}</h2>
      {error && <Banner>{error}</Banner>}
      {!data ? (
        <p className="muted">Loading&hellip;</p>
      ) : (
        <>
          <div className="card-grid" style={{ marginTop: 8 }}>
            <div>
              <div className="muted">Moderator</div>
              <NamedHolder discordId={data.flag.executor_discord_id} prefix="moderator" row={data.flag} />
            </div>
            <div>
              <div className="muted">Severity</div>
              <p>{SEVERITY_LABEL[data.flag.severity] ?? data.flag.severity}</p>
            </div>
            <div>
              <div className="muted">Rule</div>
              <p>{data.flag.rule_id}</p>
            </div>
            <div>
              <div className="muted">Status</div>
              <p>{STATUS_LABEL[data.flag.status] ?? data.flag.status}</p>
            </div>
            <div>
              <div className="muted">Automatic Response</div>
              <p>{data.flag.responses_applied_json ? JSON.parse(data.flag.responses_applied_json).join(", ") || "None" : "None"}</p>
            </div>
            <div>
              <div className="muted">Alerts Sent</div>
              <p>{data.flag.alert_count}</p>
            </div>
          </div>

          <h3 style={{ marginTop: 16 }}>Actions ({data.actions.length})</h3>
          <div className="loa-list">
            {data.actions.map(a => (
              <div className="loa-card loa-card-row" key={a.id}>
                <span className="muted" style={{ minWidth: 130 }}>{a.action_type}</span>
                <NamedHolder discordId={a.target_id} prefix="target" row={a} />
                <span className="muted" style={{ marginLeft: "auto", fontSize: "var(--text-xs)" }}>
                  {new Date(a.occurred_at).toLocaleString()}
                </span>
              </div>
            ))}
            {data.actions.length === 0 && <p className="muted">No recorded actions.</p>}
          </div>

          <h3 style={{ marginTop: 16 }}>Review</h3>
          <label>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Confirmed legitimate bulk-ban during a raid." />
          <div className="button-row" style={{ marginTop: 12 }}>
            <button className="primary" type="button" disabled={saving} onClick={() => setStatus("reviewed")}>Mark Reviewed</button>
            <button className="secondary" type="button" disabled={saving} onClick={() => setStatus("dismissed")}>Dismiss</button>
            <button className="secondary" type="button" disabled={saving} onClick={onClose}>Close</button>
          </div>
        </>
      )}
    </Modal>
  );
}
