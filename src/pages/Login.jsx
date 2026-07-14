import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, error } = useAuth();

  return (
    <div className="login-screen">
      <h1>TSRP Staff Panel</h1>
      {error && <div className="error-banner">{error}</div>}
      <button className="primary" onClick={login}>Login with Discord</button>
      <p className="muted">You must be a Texas State RP staff member to access this panel.</p>
    </div>
  );
}
