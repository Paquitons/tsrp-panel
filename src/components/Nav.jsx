import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <h1>TSRP Panel</h1>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Shifts</NavLink>
        <NavLink to="/punishments" className={({ isActive }) => (isActive ? "active" : "")}>Punishment Logs</NavLink>
        <NavLink to="/players" className={({ isActive }) => (isActive ? "active" : "")}>Player Lookup</NavLink>
        <NavLink to="/loa" className={({ isActive }) => (isActive ? "active" : "")}>Leave of Absence</NavLink>
        <button onClick={logout} style={{ marginTop: 20 }}>Log out ({user?.username})</button>
      </nav>
    </div>
  );
}
