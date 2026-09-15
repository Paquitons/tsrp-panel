// ==================================================================
// Management
//
// One place for running the staff team, replacing the HR Panel and the
// Director Console, which had grown to overlap: both did verification,
// both did staff administration, and deciding which to open meant
// knowing which one a given control had happened to be built in.
//
// Tabs are by TASK, not by rank. A Director sees more tabs than a
// Management member, in the same list and the same order, rather than
// having a separate destination of their own. The gate is per tab and
// declarative (see TABS below), so adding one means saying who it is for
// rather than remembering to wrap it.
//
// None of this is a permission. Every tab's contents re-check their own
// access against the API, which is what actually decides; a Director-only
// tab that somehow rendered would still be refused by the server.
//
// The sections themselves were not rewritten to move. They are the same
// components, rendered here instead of in two pages.
// ==================================================================
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import PageShell from "../components/primitives/PageShell";
import Banner from "../components/primitives/Banner";
import Tabs from "../components/Tabs";
import HrPanel from "./HrPanel";
import HrAutomodOffenses from "./HrAutomodOffenses";
import HrQuotas from "./HrQuotas";
import HrAnnouncements from "./HrAnnouncements";
import Verification from "./Verification";
import { canSeeManagement } from "../access";
import {
  HubSection,
  BroadcastSection,
  ManualVerificationSection,
  AuditSection,
} from "./DirectorConsole";

// `directorOnly` is the whole of the difference between what a Director
// sees and what everybody else does. Kept as data so the tab bar and the
// body cannot disagree about which tabs exist.
const TABS = [
  { value: "approvals", label: "Approvals" },
  { value: "actions", label: "Staff Actions" },
  { value: "records", label: "Records" },
  { value: "verification", label: "Verification" },
  { value: "announcements", label: "Announcements" },
  { value: "hubs", label: "Hubs", directorOnly: true },
  { value: "audit", label: "Audit Log", directorOnly: true },
];

export default function Management() {
  const { user } = useAuth();
  const isDirector = !!user?.isDirectorOrAbove;

  const [tab, setTab] = useState("approvals");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  }

  if (!canSeeManagement(user)) {
    return (
      <PageShell title="Management">
        <Banner>This area is limited to Management and above.</Banner>
      </PageShell>
    );
  }

  const visible = TABS.filter(t => !t.directorOnly || isDirector);
  // A tab can stop being visible between renders (a rank change mid
  // session), which would otherwise leave the body blank with every tab
  // unselected.
  const active = visible.some(t => t.value === tab) ? tab : visible[0].value;

  return (
    <PageShell
      title="Management"
      subtitle="Running the staff team: approvals, staff actions, records and the content the bot shows in Discord."
    >
      <Tabs tabs={visible} active={active} onChange={t => { setTab(t); setError(null); }} />

      {error && <Banner>{error}</Banner>}
      {notice && <Banner variant="success">{notice}</Banner>}

      {active === "approvals" && <HrPanel embedded view="approvals" />}
      {active === "actions" && <HrPanel embedded view="actions" />}

      {active === "records" && (
        <>
          <h2 className="dc-subhead">Weekly quotas</h2>
          <HrQuotas />
          <h2 className="dc-subhead">Automod offenses</h2>
          <HrAutomodOffenses />
          <h2 className="dc-subhead">Staff reference</h2>
          <HrPanel embedded view="reference" />
        </>
      )}

      {active === "verification" && (
        <>
          <Verification embedded />
          {isDirector && (
            <>
              <h2 className="dc-subhead">Alternative verification</h2>
              <p className="muted card-subtitle">
                For staff Roblox will not sign in, including anyone under 13. This is a different thing from the
                account linking above: it opens a one-time route for one person rather than linking an account for them.
              </p>
              <ManualVerificationSection onNotice={flash} onError={setError} />
            </>
          )}
        </>
      )}

      {active === "announcements" && (
        <>
          <HrAnnouncements />
          {isDirector && (
            <>
              <h2 className="dc-subhead">Panel announcements and messages</h2>
              <p className="muted card-subtitle">
                Sent to staff inside the Staff Panel. The announcements above are the ones the bot posts in game.
              </p>
              <BroadcastSection onNotice={flash} onError={setError} />
            </>
          )}
        </>
      )}

      {active === "hubs" && (
        <>
          <h2 className="dc-subhead">Department Hub</h2>
          <HubSection hub="department" onNotice={flash} onError={setError} />
          <h2 className="dc-subhead">Civilian Hub</h2>
          <HubSection hub="civilian" onNotice={flash} onError={setError} />
        </>
      )}

      {active === "audit" && <AuditSection />}
    </PageShell>
  );
}
