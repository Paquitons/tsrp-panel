import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Banner from "../components/primitives/Banner";

// ==================================================================
// Member verification (/verify?t=...)
//
// Where the bot's Verify button sends a member. No sign in: the token in
// the link is what ties this page to their Discord account, and it is
// sent in request bodies, never shown or stored. They pick how to prove
// their Roblox account, Roblox sign in or a sentence in their profile,
// and the API gives them the Citizen role. See the API's
// memberVerifyShared.js.
// ==================================================================

// What /auth/roblox/callback sends back in ?result=
const RESULT_MESSAGES = {
  cancelled: { variant: "warning", text: "Roblox sign in was cancelled. Pick an option to try again." },
  failed: { variant: "error", text: "Roblox sign in didn't work. Try again, or use the profile option instead." },
  conflict: { variant: "error", text: "That Roblox account is already linked to a staff member. Open a ticket if it's yours." },
  staff: { variant: "error", text: "Staff verify through the staff panel, not here." },
  not_in_server: { variant: "error", text: "You need to be in the Discord server to verify." },
  partial: { variant: "warning", text: "You're verified, but we couldn't update your roles or nickname. Open a ticket and staff will fix it." },
};

function fmtRemaining(ms) {
  if (ms <= 0) return "expired";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "under a minute";
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

export default function Verify() {
  const params = new URLSearchParams(window.location.search);
  const [token] = useState(() => params.get("t") || "");
  const [result] = useState(() => params.get("result"));

  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [mode, setMode] = useState(null); // null | "code"
  const [username, setUsername] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(null);

  const post = (path, body = {}) => apiFetch(`/member-verify${path}`, { method: "POST", body: { token, ...body }, auth: false });

  useEffect(() => {
    if (!token) { setLoadError("This link is missing its code. Press Verify in Discord again."); return; }
    post("/session")
      .then(s => {
        setState(s);
        if (s.completed) setDone(s.completed);
        if (s.challenge) { setChallenge(s.challenge); setMode("code"); setUsername(s.challenge.account.username ?? ""); }
      })
      .catch(err => setLoadError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function signInWithRoblox() {
    setError(null); setBusy(true);
    try {
      const { authorizeUrl } = await post("/oauth/start");
      window.location.assign(authorizeUrl);
    } catch (err) {
      setError(err.message); setBusy(false);
    }
  }

  async function getSentence(e) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const r = await post("/code/start", { robloxUsername: username.trim() });
      setChallenge(r.challenge);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setError(null); setBusy(true);
    try {
      const r = await post("/code/check");
      setDone({ robloxUsername: r.account.username, discordApplied: r.discordApplied });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(challenge.code).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => {}
    );
  }

  const shell = (children) => (
    <div className="identity-gate">
      <div className="identity-card verify-card">
        <img className="verify-logo" src="/images/gsrp-logo.png" alt="" />
        {children}
      </div>
    </div>
  );

  if (loadError) {
    return shell(<>
      <h1>Verify your Roblox account</h1>
      <Banner variant="error">{loadError}</Banner>
    </>);
  }

  if (!state) return shell(<p className="muted">Loading…</p>);

  if (done) {
    const partial = done.discordApplied === false || result === "partial";
    return shell(<>
      <h1>You're verified</h1>
      <p>Your Discord account is now linked to <strong>{done.robloxUsername}</strong> on Roblox.</p>
      {partial
        ? <Banner variant="warning">{RESULT_MESSAGES.partial.text}</Banner>
        : <p className="muted">You can close this page and go back to Discord.</p>}
    </>);
  }

  if (state.blocked) {
    return shell(<>
      <h1>Verify your Roblox account</h1>
      <Banner variant="error">{state.blocked.message}</Banner>
    </>);
  }

  const resultMsg = result && RESULT_MESSAGES[result];

  return shell(<>
    <h1>Verify your Roblox account</h1>
    {state.discord?.username && (
      <p className="muted">Verifying Discord account <strong>{state.discord.username}</strong>.</p>
    )}
    {state.current?.robloxUsername && (
      <p className="muted">You're linked to <strong>{state.current.robloxUsername}</strong> right now. Verifying again will replace it.</p>
    )}

    {resultMsg && !error && <Banner variant={resultMsg.variant}>{resultMsg.text}</Banner>}
    {error && <Banner variant="error">{error}</Banner>}

    {mode !== "code" ? (
      <div className="verify-options">
        <button type="button" className="verify-option" onClick={signInWithRoblox} disabled={busy || !state.canSignIn}>
          <span className="verify-option-title">Sign in with Roblox</span>
          <span className="verify-option-sub">
            {state.canSignIn ? "Fastest. Doesn't work for accounts under 13." : "Not available right now. Use the other option."}
          </span>
        </button>
        <button type="button" className="verify-option" onClick={() => { setError(null); setMode("code"); }} disabled={busy}>
          <span className="verify-option-title">Put a sentence in your profile</span>
          <span className="verify-option-sub">Works for every account, including under 13.</span>
        </button>
      </div>
    ) : !challenge ? (
      <form className="mv-form" onSubmit={getSentence}>
        <label className="mv-field">
          <span>Your Roblox username</span>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. Builderman"
            autoComplete="off"
            maxLength={30}
            disabled={busy}
            autoFocus
          />
        </label>
        <div className="identity-actions">
          <button className="primary" type="submit" disabled={busy || !username.trim()}>
            {busy ? "Checking…" : "Get my sentence"}
          </button>
          <button className="secondary" type="button" onClick={() => setMode(null)} disabled={busy}>Back</button>
        </div>
      </form>
    ) : (
      <div className="mv-panel">
        <p className="mv-account">
          Verifying <strong>{challenge.account.username}</strong>
          <span className="muted"> (Roblox ID {challenge.account.robloxId})</span>
        </p>
        <ol className="mv-steps">
          <li>Open Roblox and go to your profile.</li>
          <li>Edit your About.</li>
          <li>Paste this sentence anywhere in it, then save:</li>
        </ol>
        <div className="mv-code-row">
          <code className="mv-code">{challenge.code}</code>
          <button type="button" className="secondary small" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        </div>
        <p className="muted mv-expiry">
          Copy the whole sentence exactly. It works for {fmtRemaining(challenge.expiresAt - Date.now())}.
          You can delete it from your profile once you're verified.
        </p>
        <div className="identity-actions">
          <button className="primary" onClick={check} disabled={busy}>
            {busy ? "Checking Roblox…" : "Check my profile"}
          </button>
          <button className="secondary" onClick={() => { setChallenge(null); setError(null); }} disabled={busy}>
            Wrong account
          </button>
        </div>
      </div>
    )}
  </>);
}
