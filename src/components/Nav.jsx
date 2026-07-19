import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <h1>TSRP Panel</h1>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
        {(user?.tier === "ia" || user?.tier === "management" || user?.tier === "director") && (
          <NavLink to="/internalaffairs" className={({ isActive }) => (isActive ? "active" : "")}>Internal Affairs</NavLink>
        )}
        {(user?.tier === "management" || user?.tier === "director") && (
          <NavLink to="/hr" className={({ isActive }) => (isActive ? "active" : "")}>HR Panel</NavLink>
        )}
        {user?.isSuperAdmin && (
          <NavLink to="/super-admin" className={({ isActive }) => (isActive ? "active" : "")}>Super Admin</NavLink>
        )}
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
