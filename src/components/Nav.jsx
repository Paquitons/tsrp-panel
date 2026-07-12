import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Shifts", end: true },
  { to: "/activity", label: "Live Activity" },
  { to: "/punishments", label: "Punishment Logs" },
  { to: "/players", label: "Player Lookup" },
  { to: "/loa", label: "Leave of Absence" },
];

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <h1>TSRP Panel</h1>
      <nav>
        {links.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "active" : "")}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="user-dot" />
          <span>{user?.username}</span>
        </div>
        <button className="secondary small" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
