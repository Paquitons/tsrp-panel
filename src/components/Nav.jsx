import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DiscordAvatar from "./DiscordAvatar";
import {
  canSeeTickets, canSeeSupervisory, canSeeInternalAffairs,
  canSeeManagement, canSeeSuperAdmin,
} from "../access";
import { DashboardIcon, ShieldIcon, UsersIcon, CrownIcon, ScrollIcon, MenuIcon, CloseIcon, LogoutIcon, LinkIcon, DoorExitIcon, HistoryIcon, TerminalIcon, SearchIcon } from "./icons";
import { openCommandPalette } from "./CommandPalette";

// Ctrl on Windows and Linux, Cmd on a Mac. Read once: it cannot change
// under somebody mid-session, and it is only ever a label.
const shortcutHint =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent ?? "")
    ? "⌘K"
    : "Ctrl K";

const LOGO_URL = "https://raw.githubusercontent.com/Paquitons/FF-Studios/refs/heads/main/tsrp.png";

// The sidebar, grouped. Three bands rather than one flat list, because
// these are three different reasons to be here: the work everybody does,
// oversight of other people's work, and administration of the system.
//
// A group whose items are all hidden for this user renders nothing at
// all, heading included, so somebody with no oversight access does not
// see an empty "Oversight" label.
//
// Two things deliberately have routes but no entry here. The Staff
// Handbook is reached by link, and In-Game Permissions is a rarely-needed
// screen that was taking a permanent slot; both stay reachable by URL.
// The Changelog lives on the public site.
const NAV_GROUPS = [
  {
    key: "daily",
    label: null, // the first band needs no heading; it is where you land
    items: [
      { to: "/", label: "Dashboard", icon: DashboardIcon, end: true },
      // Support Staff read every transcript; Internal Affairs, Management
      // and Directors get the tab for Staff Complaints alone, which the
      // API scopes for them. Same tab, different contents.
      { to: "/tickets", label: "Ticket Transcripts", icon: HistoryIcon, show: canSeeTickets },
    ],
  },
  {
    key: "oversight",
    label: "Oversight",
    items: [
      { to: "/supervisory", label: "Supervisory", icon: ShieldIcon, show: canSeeSupervisory },
      { to: "/internalaffairs", label: "Internal Affairs", icon: ScrollIcon, show: canSeeInternalAffairs },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    items: [
      { to: "/management", label: "Management", icon: UsersIcon, show: canSeeManagement },
      { to: "/super-admin", label: "Super Admin", icon: CrownIcon, show: canSeeSuperAdmin },
    ],
  },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer any time the route changes -- otherwise it'd
  // stay open over the newly navigated-to page.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const groups = NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(item => !item.show || item.show(user)) }))
    .filter(group => group.items.length > 0);

  return (
    <>
      <header className="mobile-topbar">
        <span className="mobile-topbar-title">TSRP Panel</span>
        <button
          className="mobile-menu-btn"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      <div className={`sidebar-backdrop ${open ? "visible" : ""}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <img src={LOGO_URL} alt="" className="sidebar-brand-mark" />
          <span className="sidebar-brand-text">TSRP Panel</span>
        </div>

        {/* The palette's visible way in. Most people will never guess a
            keyboard shortcut exists, and one that only power users find
            is not an improvement to navigation. */}
        <button type="button" className="sidebar-search" onClick={openCommandPalette}>
          <SearchIcon className="sidebar-link-icon" />
          <span>Search the panel</span>
          <span className="sidebar-search-kbd">{shortcutHint}</span>
        </button>

        <nav className="sidebar-nav">
          {groups.map(group => (
            <div className="sidebar-group" key={group.key}>
              {group.label && <p className="sidebar-group-label">{group.label}</p>}
              {group.items.map(({ to, label, icon: ItemIcon, end }) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                  <ItemIcon className="sidebar-link-icon" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <NavLink to="/site" className="sidebar-exit-link">
          <DoorExitIcon className="sidebar-link-icon" />
          <span>Back to Website</span>
        </NavLink>

        <div className="sidebar-profile">
          <DiscordAvatar discordId={user?.discordId} avatarHash={user?.avatarHash} size={36} className="sidebar-profile-avatar" />
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">{user?.username}</span>
            {/* Their rank TITLE ("Senior Supervisor", "Directors Board"),
                not user.tier -- the tier is the coarse permission bucket
                used by the nav gates above, and only has five values for
                the whole 29-rank hierarchy, so it read "admin" for every
                Supervisor and "director" for Founder alike. The backend
                resolves this from the user's live Discord role on every
                /auth/me, so a promotion shows up here without a re-login. */}
            {user?.title && <span className="sidebar-profile-title" title={user.title}>{user.title}</span>}
          </div>
          <button className="sidebar-logout-btn" onClick={logout} aria-label="Log out" title="Log out">
            <LogoutIcon />
          </button>
        </div>
      </aside>
    </>
  );
}
