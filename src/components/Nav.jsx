import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const primaryLinks = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/loa", label: "Leave of Absence" },
];

const secondaryLinks = [
  { to: "/shifts", label: "Shift History" },
  { to: "/punishments", label: "Punishment Search" },
  { to: "/activity", label: "Activity Feed" },
];

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <h1>TSRP Panel</h1>
      <nav>
        {primaryLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "active" : "")}>
            {link.label}
          </NavLink>
        ))}
        <div className="nav-divider" />
        {secondaryLinks.map(link => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "active" : "") + " nav-secondary"}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="user-dot" />
          <span>{user?.username}</span>
          {user?.tier && <span className="tier-badge">{user.tier}</span>}
        </div>
        <button className="secondary small" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
