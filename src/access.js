// ==================================================================
// WHO SEES WHAT
//
// One module answers it, because the sidebar and the page it links to
// have to agree. When each decided separately they drifted, and the
// failure is silent in the worst direction: a link that leads to "you do
// not have access", or a page somebody can open that the nav never
// offered them.
//
// ---- Two rules, and they pull in opposite directions ----
//
// THE LADDER INHERITS UPWARD. A rank sees everything the ranks below it
// see. Management sees the Supervisory section; Directors see that and
// Management's. Every predicate below is therefore "this tier or above",
// never "this tier exactly", so adding a section means picking its floor
// rather than listing the tiers that qualify.
//
// INTERNAL AFFAIRS IS NOT ON THE LADDER. It is a sealed lane beside it,
// in both directions:
//
//   IA sees its own page, plus the two places its investigations need:
//   the Dashboard, which is where the punishment log lives, and Ticket
//   Transcripts, which the API scopes to Staff Complaints for them. It
//   does not see Supervisory, Management or Super Admin.
//
//   Nobody outside IA sees the Internal Affairs page, including
//   Directors. They lose nothing by it: the page holds Issue Strike and
//   Suggest Rank Change, and leadership already has both inside
//   Management.
//
// This is the one place the inherit-upward rule is deliberately broken,
// which is why it is written down rather than left to be inferred from
// four scattered gates.
//
// None of this is a permission. Every route re-checks its own access
// server-side; this only decides what gets drawn and linked.
// ==================================================================

/** True if this person holds one of the four Internal Affairs ranks. */
export function isInternalAffairs(user) {
  return user?.tier === "ia";
}

// ---- The ladder ----
//
// Each of these already means "or above" on the backend, and each
// already excludes IA there, so they are read rather than recomputed.

/** Supervisory, Management, Directors. Not IA. */
export function canSeeSupervisory(user) {
  return !!user?.isSupervisoryOrAbove;
}

/** Management and Directors. Not IA. */
export function canSeeManagement(user) {
  return !!user?.isManagementOrAbove;
}

/** The one hardcoded account. */
export function canSeeSuperAdmin(user) {
  return !!user?.isSuperAdmin;
}

// ---- The sealed lane ----

/**
 * The Internal Affairs page: IA and nobody else.
 *
 * Deliberately NOT "or above". This is the exception to the ladder, and
 * writing it as an equality is what makes that visible at the point of
 * decision instead of hiding it inside a chain of tier comparisons.
 */
export function canSeeInternalAffairs(user) {
  return isInternalAffairs(user);
}

// ---- Shared by both ----

/**
 * Ticket Transcripts stays gated on the literal Support Staff role
 * rather than on rank, which makes it the one section the ladder does
 * not carry: handling tickets is a job somebody is given, not a rung
 * they reach. IA reaches it by a separate claim, and the API narrows
 * them to Staff Complaints.
 */
export function canSeeTickets(user) {
  return !!user?.isSupportStaff || !!user?.canViewStaffComplaints;
}
