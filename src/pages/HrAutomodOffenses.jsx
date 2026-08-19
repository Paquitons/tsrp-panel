import { useState } from "react";
import { apiFetch } from "../api";
import { useStaffSearch } from "../hooks/useStaffSearch";
import DiscordAvatar from "../components/DiscordAvatar";
import PortalDropdown from "../components/PortalDropdown";
import Banner from "../components/primitives/Banner";
import { useApiQuery } from "../hooks/useApiQuery";
import { expiresLabel } from "../utils";

function fmtTime(ts) {
  return new Date(ts).toLocaleString();
}

function statusClass(status) {
  if (status === "active") return "loa-status-pending";
  if (status === "expired") return "loa-status-ended";
  return "loa-status-denied"; // cleared
}

export default function HrAutomodOffenses() {
  const search = useStaffSearch("/automod-offenses/members", "members");
  const [selectedDiscordId, setSelectedDiscordId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  const query = useApiQuery(["automod-offenses", selectedDiscordId], selectedDiscordId && `/automod-offenses/${selectedDiscordId}`);
  const data = query.data;

  function pickMember(member) {
    search.pick(member);
    setSelectedDiscordId(member.discordId);
  }

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function clearOne(id) {
    const reason = prompt("Reason for clearing this offense (optional):") ?? undefined;
    setActionError(null);
    try {
      await apiFetch(`/automod-offenses/${id}/clear`, { method: "POST", body: { reason } });
      flash("Offense cleared.");
      query.refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function clearAll() {
    if (!confirm(`Clear every active offense for this user? Their escalation level will reset to zero.`)) return;
    const reason = prompt("Reason for clearing all offenses (optional):") ?? undefined;
    setActionError(null);
    try {
      const { cleared } = await apiFetch(`/automod-offenses/${data.discordId}/clear-all`, { method: "POST", body: { reason } });
      flash(`Cleared ${cleared} offense(s).`);
      query.refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <>
      <p className="muted card-subtitle">Offenses expire on their own after a set time -- clearing here resets someone's escalation level immediately instead of waiting.</p>

      <label>Find a Discord User</label>
      <div className="autocomplete-wrap">
        <input
          ref={search.inputRef}
          autoComplete="off"
          value={search.query}
          onChange={e => search.onQueryChange(e.target.value)}
          onFocus={() => search.suggestions.length > 0 && search.setShowSuggestions(true)}
          placeholder="Search by username, nickname, or Discord user ID"
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

      {query.isLoading && <p className="muted">Loading…</p>}
      {(query.isError || actionError) && <Banner>{actionError ?? query.error?.message}</Banner>}
      {notice && <Banner variant="success">{notice}</Banner>}

      {data && (
        <>
          <div className="modal-title-row" style={{ marginTop: 16 }}>
            <h2 style={{ margin: 0 }}>Active Offenses ({data.active.length})</h2>
            {data.active.length > 0 && <button className="btn-red small" type="button" onClick={clearAll}>Clear All</button>}
          </div>

          {data.active.length === 0 ? (
            <p className="muted">No active offenses -- clean record right now.</p>
          ) : (
            <div className="loa-list">
              {data.active.map(o => (
                <div className="loa-card" key={o.id}>
                  <div className="loa-card-top loa-card-top-stack">
                    <span className={`badge ${statusClass(o.status)}`}>{data.ruleLabels[o.rule] ?? o.rule}</span>
                    <span className="muted">{expiresLabel(o.expires_at)}</span>
                  </div>
                  <div className="log-card-field"><span className="muted">Action Taken:</span> {o.action_taken}</div>
                  <div className="log-card-field"><span className="muted">Issued:</span> {fmtTime(o.created_at)}</div>
                  {o.message_content && <div className="log-card-field"><span className="muted">Message:</span> {o.message_content}</div>}
                  <button className="secondary small" type="button" style={{ marginTop: 8 }} onClick={() => clearOne(o.id)}>Clear</button>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: 20 }}>Full History ({data.history.length})</h2>
          {data.history.length === 0 ? (
            <p className="muted">No offenses on record.</p>
          ) : (
            <div className="loa-list">
              {data.history.map(o => (
                <div className="loa-card" key={o.id}>
                  <div className="loa-card-top loa-card-top-stack">
                    <span className={`badge ${statusClass(o.status)}`}>{data.ruleLabels[o.rule] ?? o.rule}</span>
                    <span className="muted">{o.status === "active" ? expiresLabel(o.expires_at) : o.status}</span>
                  </div>
                  <div className="log-card-field"><span className="muted">Action Taken:</span> {o.action_taken}</div>
                  <div className="log-card-field"><span className="muted">Issued:</span> {fmtTime(o.created_at)}</div>
                  {o.status === "cleared" && (
                    <div className="log-card-field">
                      <span className="muted">Cleared:</span> {fmtTime(o.cleared_at)} ({o.cleared_reason})
                      {o.cleared_by && (
                        <>
                          {" "}by <DiscordAvatar discordId={o.cleared_by} avatarHash={o.clearedBy_avatar_hash} size={16} style={{ verticalAlign: "middle", margin: "0 4px" }} />
                          {o.clearedBy_nickname || o.clearedBy_username || "Unknown Member"}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
