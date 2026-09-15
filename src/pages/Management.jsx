// ==================================================================
// Management
//
// One place for running the staff team, replacing the HR Panel and the
// Director Console.
//
// ---- The shape, and why ----
//
// Tabs are by TASK. A Director sees more than a Management member, in
// the same list and the same order, rather than having a separate
// destination of their own.
//
// Every tab holds ONE KIND OF THING. That is the rule the previous
// version broke: "Records" stacked weekly quotas, automod offences and
// the staff directory into a single scroll, and "Announcements" put the
// Director's panel broadcast underneath all fifty-five in-game messages.
// Sending a message to the staff team therefore meant scrolling past a
// list that had nothing to do with it, and the scroll grew every time
// somebody added an in-game message. Where a tab genuinely holds several
// things, they are sub-tabs now: you pick one instead of scrolling past
// the others.
//
//   Approvals      the decisions waiting on you, with a count on the tab
//   Staff          everything about a person: act, quotas, offences, directory
//   Verification   linking Roblox accounts, and the fallback for under-13s
//   Content        what the bot publishes: in-game messages, staff messages, hubs
//   Audit Log      the record (Directors)
//
// Approvals stays on its own at the top because it is the reason to open
// this page at all, and it is the one tab whose contents are time
// sensitive. Everything else is something you go looking for.
//
// None of this is a permission. Every tab's contents re-check their own
// access against the API, which is what actually decides; a Director-only
// tab that somehow rendered would still be refused by the server.
// ==================================================================
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useApiQuery } from "../hooks/useApiQuery";
import { useOpenOnArrival } from "../hooks/useOpenOnArrival";

// Slower than HrPanel's own 3s, on purpose. React-query polls a shared
// key at the shortest interval any live observer asks for, so the list
// still refreshes every 3s while you are looking at it, and drops back to
// this once only the tab badge is watching.
const BADGE_POLL_MS = 20_000;
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
// sees and what everybody else does, at both levels. Kept as data so the
// tab bars and the body cannot disagree about which tabs exist, and so
// adding one means saying who it is for rather than remembering to wrap
// it in a conditional.
const TABS = [
  { value: "approvals", label: "Approvals" },
  {
    value: "staff",
    label: "Staff",
    sections: [
      { value: "actions", label: "Take Action" },
      { value: "quotas", label: "Weekly Quotas" },
      { value: "automod", label: "Automod Offenses" },
      { value: "directory", label: "Directory" },
    ],
  },
  {
    value: "verification",
    label: "Verification",
    sections: [
      { value: "accounts", label: "Accounts" },
      { value: "alternative", label: "Alternative Access", directorOnly: true },
    ],
  },
  {
    value: "content",
    label: "Content",
    sections: [
      { value: "ingame", label: "In-Game Messages" },
      { value: "staffmsg", label: "Staff Messages", directorOnly: true },
      { value: "hub-department", label: "Department Hub", directorOnly: true },
      { value: "hub-civilian", label: "Civilian Hub", directorOnly: true },
    ],
  },
  { value: "audit", label: "Audit Log", directorOnly: true },
];

export default function Management() {
  const { user } = useAuth();
  const isDirector = !!user?.isDirectorOrAbove;

  const [tab, setTab] = useState("approvals");
  // One remembered sub-tab per parent, so coming back to Content lands
  // where you left it rather than resetting to the first section.
  const [sections, setSections] = useState({});
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // The count on the Approvals tab. These are the same two queries, with
  // the same keys and the same gating, that HrPanel runs for the tab's
  // contents, so react-query serves both from one request rather than
  // doubling the polling. Rank changes are gated exactly as they are
  // there: somebody who cannot review them must not have them counted
  // into a number that then does not match what they open.
  // Gated exactly as HrPanel gates them. The hooks have to run before the
  // access check below, because hooks cannot be called conditionally, so
  // the gating lives in the query itself: a passing URL or a falsy one.
  const canAccess = canSeeManagement(user);
  const canReviewBigActions = !!user?.canReviewBigActions;
  const pendingLOAs = useApiQuery(
    ["loa", "pending"],
    canAccess && "/loa/pending",
    { refetchInterval: BADGE_POLL_MS, select: d => d.requests?.length ?? 0 },
  );
  const pendingRanks = useApiQuery(
    ["rank-changes", "pending"],
    canAccess && canReviewBigActions && "/rank-changes/pending",
    { refetchInterval: BADGE_POLL_MS, select: d => d.requests?.length ?? 0 },
  );
  const pendingCount = (pendingLOAs.data ?? 0) + (pendingRanks.data ?? 0);

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  }

  const visible = useMemo(
    () => TABS
      .filter(t => !t.directorOnly || isDirector)
      .map(t => ({
        ...t,
        sections: t.sections?.filter(s => !s.directorOnly || isDirector),
        count: t.value === "approvals" ? pendingCount : undefined,
      })),
    [isDirector, pendingCount],
  );

  if (!canAccess) {
    return (
      <PageShell title="Management">
        <Banner>This area is limited to Management and above.</Banner>
      </PageShell>
    );
  }

  // A tab can stop being visible between renders (a rank change mid
  // session), which would otherwise leave the body blank with every tab
  // unselected.
  const current = visible.find(t => t.value === tab) ?? visible[0];
  const subs = current.sections ?? [];
  // Same guard one level down: a sub-tab the viewer just lost, or a
  // parent they have never opened, falls back to that parent's first.
  const section = subs.some(s => s.value === sections[current.value])
    ? sections[current.value]
    : subs[0]?.value;

  // The command palette sends people straight to a section:
  // /management?do=staffmsg opens Content with Staff Messages selected.
  // A name is matched against the top level first, then against every
  // sub-tab, so one vocabulary covers both levels and the palette does
  // not have to know which is which.
  useOpenOnArrival(what => {
    if (TABS.some(t => t.value === what)) { setTab(what); return; }
    const parent = TABS.find(t => t.sections?.some(sec => sec.value === what));
    if (parent) {
      setTab(parent.value);
      setSections(prev => ({ ...prev, [parent.value]: what }));
    }
  });

  const pickTab = value => { setTab(value); setError(null); };
  const pickSection = value => {
    setSections(prev => ({ ...prev, [current.value]: value }));
    setError(null);
  };

  return (
    <PageShell
      title="Management"
      subtitle="Running the staff team: approvals, staff actions, records and the content the bot shows in Discord."
    >
      <Tabs tabs={visible} active={current.value} onChange={pickTab} ariaLabel="Management sections" />

      {/* The second row is ALWAYS here, even for Approvals and the Audit
          Log, which have nothing to put in it. It used to be dropped when
          a tab had no sub-tabs, and everything below it jumped 50px up and
          back down as you moved between tabs that had one and tabs that
          did not. With the row always present it is a rule under the tab
          bar when it is empty, and the page below never moves. */}
      <Tabs
        tabs={subs}
        active={section}
        onChange={pickSection}
        variant="sub"
        ariaLabel={`${current.label} sections`}
      />

      {error && <Banner>{error}</Banner>}
      {notice && <Banner variant="success">{notice}</Banner>}

      {current.value === "approvals" && <HrPanel embedded view="approvals" />}

      {current.value === "staff" && (
        <>
          {section === "actions" && <HrPanel embedded view="actions" />}
          {section === "quotas" && <HrQuotas />}
          {section === "automod" && <HrAutomodOffenses />}
          {section === "directory" && <HrPanel embedded view="reference" />}
        </>
      )}

      {current.value === "verification" && (
        <>
          {section === "accounts" && <Verification embedded />}
          {section === "alternative" && (
            <ManualVerificationSection onNotice={flash} onError={setError} />
          )}
        </>
      )}

      {current.value === "content" && (
        <>
          {section === "ingame" && <HrAnnouncements />}
          {section === "staffmsg" && <BroadcastSection onNotice={flash} onError={setError} />}
          {section === "hub-department" && <HubSection hub="department" onNotice={flash} onError={setError} />}
          {section === "hub-civilian" && <HubSection hub="civilian" onNotice={flash} onError={setError} />}
        </>
      )}

      {current.value === "audit" && <AuditSection />}
    </PageShell>
  );
}
