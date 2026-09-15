// ==================================================================
// Internal Affairs
//
// Investigating the staff team. The page draws itself from what the
// viewer's IA rank may ACTUALLY DO, rather than showing every control and
// refusing afterwards:
//
//   IA Supervisor   strike, terminate, demote
//   IA Officer      strike, terminate, demote
//   Internal Affairs  strike
//   Trial IA        none of the above, reading only
//
// The list comes from the session's iaPermissions claim, which panel-api
// builds from the bot's own iaPermissions table. So a rank that cannot
// terminate is not shown a Terminate form at all, and there is no path
// where somebody fills one in and is told no at the end.
//
// PROMOTION IS ABSENT, at every rank, and that is not an omission. IA
// does not promote: the tier exists to hold the staff team to account,
// and a body that can reward as well as punish is a different thing.
// There used to be a "Suggest a Rank Change" form here with a
// promote/demote toggle, which offered promotion to every IA rank and
// then relied on the backend to refuse it.
//
// None of this is a permission. Every action re-checks the same table
// server-side; this only decides what gets drawn.
// ==================================================================
import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import PortalDropdown from "../components/PortalDropdown";
import CustomSelect from "../components/CustomSelect";
import { useStaffSearch } from "../hooks/useStaffSearch";
import DiscordAvatar from "../components/DiscordAvatar";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import Card from "../components/primitives/Card";
import PageShell from "../components/primitives/PageShell";
import Banner from "../components/primitives/Banner";
import { canSeeInternalAffairs } from "../access";

/** The staff picker, which all three actions need in the same shape. */
function StaffPicker({ search, label = "Staff Member" }) {
  return (
    <>
      <label>{label}</label>
      <div className="autocomplete-wrap">
        <input
          ref={search.inputRef}
          required
          autoComplete="off"
          value={search.query}
          onChange={e => search.onQueryChange(e.target.value)}
          onFocus={() => search.suggestions.length > 0 && search.setShowSuggestions(true)}
          placeholder="Search by username or nickname"
        />
        <PortalDropdown
          anchorRef={search.inputRef}
          open={search.showSuggestions}
          onClose={() => search.setShowSuggestions(false)}
          className="autocomplete-list-portal"
        >
          {search.suggestions.map(s => (
            <div key={s.discordId} className="autocomplete-item" onClick={() => search.pick(s)}>
              <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={26} />
              <span className="autocomplete-name">{s.nickname ?? s.username}</span>
            </div>
          ))}
        </PortalDropdown>
      </div>
    </>
  );
}

// ------------------------------------------------------------------
function StrikeCard() {
  const search = useStaffSearch();
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null); setDone(false); setBusy(true);
    try {
      if (!search.target) throw new Error("Pick a staff member first.");
      await apiFetch("/strikes", { method: "POST", body: { discordId: search.target.discordId, reason } });
      setDone(true); setReason(""); search.reset();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Card>
      <h2>Issue a Strike</h2>
      <p className="muted card-subtitle">Every strike expires on its own after 14 days. Three active at once goes to the third-strike decision.</p>
      {error && <Banner>{error}</Banner>}
      {done && <Banner variant="success">Strike issued.</Banner>}
      <form onSubmit={submit}>
        <StaffPicker search={search} />
        <label>Reason</label>
        <AutoGrowTextarea required value={reason} onChange={e => setReason(e.target.value)} />
        <button className="primary" type="submit" disabled={busy}>{busy ? "Issuing…" : "Issue Strike"}</button>
      </form>
    </Card>
  );
}

// ------------------------------------------------------------------
function DemoteCard() {
  const search = useStaffSearch();
  const [ranks, setRanks] = useState([]);
  const [newRank, setNewRank] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // The valid ranks depend on who is being demoted, so they are fetched
  // once a target is chosen. action is hardcoded to demote: there is no
  // toggle here, because there is no other thing this form can do.
  useEffect(() => {
    if (!search.target) { setRanks([]); setNewRank(""); return; }
    apiFetch(`/rank-changes/ranks?targetId=${search.target.discordId}&action=demote`)
      .then(({ ranks }) => { setRanks(ranks); setNewRank(ranks[0]?.value ?? ""); })
      .catch(() => setRanks([]));
  }, [search.target]);

  async function submit(e) {
    e.preventDefault();
    setError(null); setDone(false); setBusy(true);
    try {
      if (!search.target) throw new Error("Pick a staff member first.");
      await apiFetch("/rank-changes", {
        method: "POST",
        body: { action: "demote", targetDiscordId: search.target.discordId, newRank, reason },
      });
      setDone(true); setReason(""); setRanks([]); search.reset();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Card>
      <h2>Demote</h2>
      <p className="muted card-subtitle">Applied immediately, without going to anybody for approval, and recorded against your name.</p>
      {error && <Banner>{error}</Banner>}
      {done && <Banner variant="success">Demotion applied.</Banner>}
      <form onSubmit={submit}>
        <StaffPicker search={search} />
        <label>New Rank</label>
        <CustomSelect
          value={newRank}
          onChange={setNewRank}
          options={ranks}
          placeholder={search.target ? "No rank below theirs" : "Pick a staff member first"}
        />
        <label>Reason</label>
        <AutoGrowTextarea required value={reason} onChange={e => setReason(e.target.value)} />
        <button className="primary" type="submit" disabled={busy || ranks.length === 0}>
          {busy ? "Applying…" : "Demote"}
        </button>
      </form>
    </Card>
  );
}

// ------------------------------------------------------------------
function TerminateCard() {
  const search = useStaffSearch();
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null); setDone(false);
    if (!search.target) { setError("Pick a staff member first."); return; }
    const who = search.target.nickname ?? search.target.username;
    if (!confirm(`Terminate ${who}? They are removed from the staff team immediately and this cannot be undone from here.`)) return;
    setBusy(true);
    try {
      await apiFetch("/staff-removal/terminate", {
        method: "POST",
        body: { targetDiscordId: search.target.discordId, reason },
      });
      setDone(true); setReason(""); search.reset();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Card>
      <h2>Terminate</h2>
      <p className="muted card-subtitle">Removes them from the staff team immediately. Applied without approval and recorded against your name.</p>
      {error && <Banner>{error}</Banner>}
      {done && <Banner variant="success">Staff member terminated.</Banner>}
      <form onSubmit={submit}>
        <StaffPicker search={search} />
        <label>Reason</label>
        <AutoGrowTextarea required value={reason} onChange={e => setReason(e.target.value)} />
        <button className="btn-red" type="submit" disabled={busy}>{busy ? "Terminating…" : "Terminate"}</button>
      </form>
    </Card>
  );
}

// ------------------------------------------------------------------
export default function InternalAffairs() {
  const { user } = useAuth();

  // Internal Affairs only, Management and Directors included in the
  // exclusion. IA sits beside the staff ladder rather than on it.
  if (!canSeeInternalAffairs(user)) {
    return (
      <PageShell title="Internal Affairs">
        <Banner>You need Internal Affairs access to view this page.</Banner>
      </PageShell>
    );
  }

  // Missing claim means an older session token. Treated as holding
  // nothing rather than everything: this list only decides what is drawn,
  // and drawing too little is recoverable by signing in again, while
  // drawing too much offers actions the server will refuse.
  const held = Array.isArray(user?.iaPermissions) ? user.iaPermissions : [];
  const can = p => held.includes(p);
  const hasAnyAction = can("strike") || can("demote") || can("terminate");

  return (
    <PageShell
      title="Internal Affairs"
      subtitle="Investigating the staff team. What you see here is what your IA rank can do."
    >
      {!hasAnyAction && (
        <Card>
          <h2>Read only</h2>
          <p className="muted" style={{ margin: 0 }}>
            Your IA rank carries no actions yet. You can read the punishment log from the Dashboard and any
            Staff Complaint transcript from Ticket Transcripts, which is what an investigation runs on.
            Striking, demoting and terminating come with Internal Affairs and above.
          </p>
        </Card>
      )}

      <div className="card-grid">
        {can("strike") && <StrikeCard />}
        {can("demote") && <DemoteCard />}
        {can("terminate") && <TerminateCard />}
      </div>

      {hasAnyAction && (
        <p className="muted ia-foot">
          Internal Affairs never promotes. These actions apply immediately without going to anybody for
          approval, and every one of them is recorded against your name.
        </p>
      )}
    </PageShell>
  );
}
