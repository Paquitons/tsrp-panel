import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DiscordIcon } from "../components/icons";

export default function Login() {
  const { login, error } = useAuth();

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="https://raw.githubusercontent.com/Paquitons/FF-Studios/refs/heads/main/tsrp.png" alt="" className="login-logo" />
        <h1>TSRP Staff Panel</h1>
        <p className="muted">You must be a Texas State RP staff member to access this panel.</p>

        {error && <div className="error-banner">{error}</div>}

        <button className="primary login-discord-btn" onClick={login}>
          <DiscordIcon />
          Login with Discord
        </button>
      </div>

      <div className="login-footer-links">
        <Link to="/" className="muted login-footer-link">&larr; Back to Texas State RP</Link>
        <Link to="/changelog" className="muted login-footer-link">View changelog</Link>
      </div>
    </div>
  );
}
