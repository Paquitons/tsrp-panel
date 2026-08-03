import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DiscordAvatar from "./DiscordAvatar";
import { DashboardIcon, ShieldIcon, UsersIcon, CrownIcon, ScrollIcon, MenuIcon, CloseIcon, LogoutIcon } from "./icons";

const LOGO_URL = "https://raw.githubusercontent.com/Paquitons/FF-Studios/refs/heads/main/tsrp.png";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: DashboardIcon, end: true },
  {
    to: "/internalaffairs",
    label: "Internal Affairs",
    icon: ShieldIcon,
    show: user => user?.tier === "ia" || user?.tier === "management" || user?.tier === "director",
  },
  {
    to: "/hr",
    label: "HR Panel",
    icon: UsersIcon,
    show: user => user?.tier === "management" || user?.tier === "director",
  },
  { to: "/super-admin", label: "Super Admin", icon: CrownIcon, show: user => user?.isSuperAdmin },
  { to: "/changelog", label: "Changelog", icon: ScrollIcon },
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

  const items = NAV_ITEMS.filter(item => !item.show || item.show(user));

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

        <nav className="sidebar-nav">
          {items.map(({ to, label, icon: ItemIcon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
              <ItemIcon className="sidebar-link-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-profile">
          <DiscordAvatar discordId={user?.discordId} avatarHash={user?.avatarHash} size={36} className="sidebar-profile-avatar" />
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">{user?.username}</span>
            {user?.tier && <span className="sidebar-profile-tier">{user.tier}</span>}
          </div>
          <button className="sidebar-logout-btn" onClick={logout} aria-label="Log out" title="Log out">
            <LogoutIcon />
          </button>
        </div>
      </aside>
    </>
  );
}
