// ==================================================================
// THE COMMAND REGISTRY
//
// Everything the palette can take you to, in one list. A command is a
// destination plus who may see it; the palette does the matching and the
// navigating and knows nothing about the panel's structure.
//
//   to      where it goes. A `do` query on the end asks the page to open
//           that action on arrival (see useOpenOnArrival).
//   show    the same predicates the sidebar and the pages use, from
//           access.js, so the palette cannot offer somebody a door they
//           do not have. Omitted means everybody signed in.
//   keywords
//           what somebody might type INSTEAD of the label. "sack" for
//           terminate, "holiday" for LOA. Without these a palette only
//           works for people who already know what the feature is called,
//           which are the people who least need it.
//
// This is not a permission boundary. It decides what is listed; every
// route and every action re-checks access on its own, server-side.
//
// DELIBERATELY ABSENT: Request Staff. It pings the whole staff team in
// Discord, and a keystroke away from a mass ping is not a convenience.
// It stays on the Dashboard where it takes a deliberate click.
// ==================================================================
import {
  canSeeTickets, canSeeSupervisory, canSeeInternalAffairs,
  canSeeManagement, canSeeSuperAdmin,
} from "./access";

const isDirector = user => !!user?.isDirectorOrAbove;
const canWriteLogs = user => !!user?.canWriteLogs;
const canUseShifts = user => !!user?.canUseShifts;
const iaCan = perm => user =>
  canSeeInternalAffairs(user) && (user?.iaPermissions ?? []).includes(perm);

export const COMMANDS = [
  // ---- Things you do, which is what a palette is actually for ----
  {
    id: "lookup", label: "Player Lookup", group: "Actions",
    to: "/?do=lookup", keywords: "search player roblox profile history who is",
  },
  {
    id: "new-log", label: "Create New Log", group: "Actions",
    to: "/?do=new-log", show: canWriteLogs,
    keywords: "punishment warn kick ban note moderation record",
  },
  {
    id: "loa", label: "Manage LOA", group: "Actions",
    to: "/?do=loa", keywords: "leave of absence holiday away time off break",
  },
  {
    id: "shift-history", label: "My Shift History", group: "Actions",
    to: "/?do=shift-history", show: canUseShifts, keywords: "duty hours past shifts",
  },
  {
    id: "leaderboard", label: "Shift Leaderboard", group: "Actions",
    to: "/?do=leaderboard", show: canUseShifts, keywords: "top hours ranking duty",
  },
  {
    id: "run-command", label: "Run Command", group: "Actions",
    to: "/?do=run-command", show: user => user?.tier === "management" || user?.tier === "director",
    keywords: "erlc console execute in game",
  },

  // ---- Oversight ----
  {
    id: "bolos", label: "Review Ban BOLOs", group: "Oversight",
    to: "/supervisory?do=bolos", show: canSeeSupervisory,
    keywords: "ban requests queue approve decline pending",
  },
  {
    id: "cooldowns", label: "Kick Rejoin Cooldowns", group: "Oversight",
    to: "/supervisory?do=cooldowns", show: canSeeSupervisory,
    keywords: "rejoin lockout kicked timer lift remove",
  },
  {
    id: "ia-strike", label: "Issue a Strike (Internal Affairs)", group: "Oversight",
    to: "/internalaffairs", show: iaCan("strike"), keywords: "discipline staff misconduct",
  },
  {
    id: "ia-demote", label: "Demote (Internal Affairs)", group: "Oversight",
    to: "/internalaffairs", show: iaCan("demote"), keywords: "rank down discipline",
  },
  {
    id: "ia-terminate", label: "Terminate (Internal Affairs)", group: "Oversight",
    to: "/internalaffairs", show: iaCan("terminate"), keywords: "fire sack remove staff",
  },

  // ---- Management ----
  {
    id: "approvals", label: "Approvals", group: "Management",
    to: "/management?do=approvals", show: canSeeManagement,
    keywords: "pending rank changes loa requests waiting decide inbox",
  },
  {
    id: "take-action", label: "Take Action on a Staff Member", group: "Management",
    to: "/management?do=actions", show: canSeeManagement,
    keywords: "strike promote demote terminate resign fire discipline",
  },
  {
    id: "quotas", label: "Weekly Quotas", group: "Management",
    to: "/management?do=quotas", show: canSeeManagement, keywords: "hours activity duty met missed",
  },
  {
    id: "automod", label: "Automod Offenses", group: "Management",
    to: "/management?do=automod", show: canSeeManagement, keywords: "filter violations discord",
  },
  {
    id: "directory", label: "Staff Directory", group: "Management",
    to: "/management?do=directory", show: canSeeManagement, keywords: "reference roster who list everyone",
  },
  {
    id: "verify", label: "Account Verification", group: "Management",
    to: "/management?do=accounts", show: canSeeManagement, keywords: "roblox link unlink verify",
  },
  {
    id: "alt-verify", label: "Alternative Verification", group: "Management",
    to: "/management?do=alternative", show: isDirector, keywords: "under 13 manual grant profile code",
  },

  // ---- Content the bot publishes ----
  {
    id: "ingame-messages", label: "In-Game Messages", group: "Content",
    to: "/management?do=ingame", show: canSeeManagement,
    keywords: "announcements hint message erlc chat reusable",
  },
  {
    id: "staff-message", label: "Send a Staff Message", group: "Content",
    to: "/management?do=staffmsg", show: isDirector,
    keywords: "announcement broadcast panel notice pm private message everyone global",
  },
  {
    id: "hub-department", label: "Department Hub", group: "Content",
    to: "/management?do=hub-department", show: isDirector, keywords: "discord hub departments invite",
  },
  {
    id: "hub-civilian", label: "Civilian Hub", group: "Content",
    to: "/management?do=hub-civilian", show: isDirector, keywords: "discord hub civilian invite",
  },
  {
    id: "audit", label: "Audit Log", group: "Content",
    to: "/management?do=audit", show: isDirector, keywords: "history who did what record trail",
  },

  // ---- Pages ----
  { id: "dashboard", label: "Dashboard", group: "Go to", to: "/", keywords: "home shift on duty players" },
  { id: "tickets", label: "Ticket Transcripts", group: "Go to", to: "/tickets", show: canSeeTickets, keywords: "support archive complaint" },
  { id: "supervisory", label: "Supervisory", group: "Go to", to: "/supervisory", show: canSeeSupervisory },
  { id: "internalaffairs", label: "Internal Affairs", group: "Go to", to: "/internalaffairs", show: canSeeInternalAffairs, keywords: "ia complaints investigation" },
  { id: "management", label: "Management", group: "Go to", to: "/management", show: canSeeManagement, keywords: "hr director console" },
  { id: "permissions", label: "In-Game Permissions", group: "Go to", to: "/permissions", show: canSeeManagement, keywords: "mod admin grants revoke erlc" },
  { id: "super-admin", label: "Super Admin", group: "Go to", to: "/super-admin", show: canSeeSuperAdmin, keywords: "economy wallets stocks bot settings" },
  { id: "handbook", label: "Staff Handbook", group: "Go to", to: "/staff-handbook", keywords: "rules guide policy how do i documentation" },
  { id: "changelog", label: "Changelog", group: "Go to", to: "/changelog", keywords: "updates what changed release notes version" },
];

/** The commands this person may actually use. */
export function commandsFor(user) {
  return COMMANDS.filter(c => !c.show || c.show(user));
}

/**
 * Score a command against what has been typed. Higher is better, and 0
 * means it does not match at all.
 *
 * Ordering is by WHERE the match landed rather than by a similarity
 * percentage: a label that starts with what you typed is almost always
 * the one you meant, and burying it under a keyword match somewhere else
 * makes the first result feel random. Only the label and the keywords are
 * searched, never the route, so typing "management" does not pull in
 * every screen that happens to live under /management.
 */
export function score(command, query) {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const label = command.label.toLowerCase();
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;

  // A match at the start of any word in the label: "ban" finds "Review
  // Ban BOLOs" without also finding every label containing those letters.
  if (label.split(/\s+/).some(w => w.startsWith(q))) return 60;
  if (label.includes(q)) return 40;
  if ((command.keywords ?? "").includes(q)) return 20;

  // Last resort: the letters in order, anywhere. Catches "stfmsg" for
  // "Send a Staff Message" and typos that drop a letter.
  let i = 0;
  for (const ch of label) if (ch === q[i]) i++;
  return i === q.length ? 10 : 0;
}
