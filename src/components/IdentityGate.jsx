import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import Banner from "./primitives/Banner";

// ==================================================================
// "Is this you?"
//
// Sits between logging in and the panel. It asks one question, shows
// the Roblox account currently attached to the staff profile, and takes
// one of two answers.
//
// Yes is a confirmation, not proof, and it is worth having anyway: it is
// how somebody notices their link has been changed underneath them. No
// sends them to Roblox, which is the only thing that actually proves an
// account, and the only thing that unlocks in-game power.
//
// The gate never blocks on its own failure. If the check cannot run, the
// panel opens: locking every staff member out because a lookup timed out
// would be a worse outcome than a session going unconfirmed for an hour.
// ==================================================================

const OUTCOMES = {
  ok:        { tone: "good", text: "Your Roblox account has been verified." },
  changed:   { tone: "good", text: "Verified. The Roblox account on your staff profile has been updated." },
  cancelled: { tone: "warn", text: "You cancelled the Roblox sign in, so nothing changed." },
  expired:   { tone: "warn", text: "That verification link expired. Please try again." },
  conflict:  { tone: "bad",  text: "That Roblox account is already verified to another staff member. Nothing was changed. Speak to management." },
  failed:    { tone: "bad",  text: "Roblox could not confirm that sign in. Please try again." },
};

/** Reads and clears ?verify=... left by the callback redirect. */
function useVerifyOutcome() {
  const [outcome, setOutcome] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("verify");
    if (!v) return;
    setOutcome(OUTCOMES[v] ?? OUTCOMES.failed);
    params.delete("verify");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, []);
  return outcome;
}

function Account({ account }) {
  if (!account) return null;
  return (
    <div className="identity-account">
      {account.avatarUrl
        ? <img className="identity-avatar" src={account.avatarUrl} alt="" />
        : <div className="identity-avatar identity-avatar-blank" aria-hidden="true" />}
      <div className="identity-names">
        <span className="identity-display">{account.displayName || account.username || "Unknown account"}</span>
        {account.username && <span className="identity-username">@{account.username}</span>}
        <span className="identity-id">Roblox ID {account.robloxId}</span>
      </div>
    </div>
  );
}

export default function IdentityGate({ children }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const outcome = useVerifyOutcome();

  useEffect(() => {
    let cancelled = false;
    apiFetch("/identity/me")
      .then(d => { if (!cancelled) setState(d); })
      // A failed check must not lock anybody out -- open the panel.
      .catch(() => { if (!cancelled) setState({ action: "none" }); });
    return () => { cancelled = true; };
  }, [outcome]);

  async function confirm() {
    setBusy(true); setError(null);
    try {
      await apiFetch("/identity/confirm", { method: "POST" });
      setState({ action: "none" });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function startVerify() {
    setBusy(true); setError(null);
    try {
      const { authorizeUrl } = await apiFetch("/identity/verify/start", { method: "POST" });
      window.location.href = authorizeUrl;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  // Still checking, or nothing to ask.
  if (!state || state.action === "none") {
    return (
      <>
        {outcome && <div className="identity-toast-wrap"><Banner>{outcome.text}</Banner></div>}
        {children}
      </>
    );
  }

  const mustVerify = state.action === "verify";

  return (
    <div className="identity-gate">
      <div className="identity-card">
        <h1>{mustVerify ? "Verify your Roblox account" : "Is this you?"}</h1>

        {outcome && <Banner>{outcome.text}</Banner>}

        {mustVerify ? (
          <>
            <p className="muted">
              {state.reason || "Your Roblox account needs to be verified before you can continue."}
            </p>
            <Account account={state.account} />
            <p className="muted identity-note">
              You will sign in with Roblox. We never see your password, and we cannot
              act on your account.
            </p>
          </>
        ) : (
          <>
            <p className="muted">This is the Roblox account attached to your staff profile.</p>
            <Account account={state.account} />
          </>
        )}

        {error && <Banner>{error}</Banner>}
        {!state.canVerify && mustVerify && (
          <Banner>Roblox sign in isn't set up yet, so this can't be completed. Tell an administrator.</Banner>
        )}

        <div className="identity-actions">
          {!mustVerify && (
            <button className="primary" onClick={confirm} disabled={busy}>
              {busy ? "Saving…" : "Yes, this is me"}
            </button>
          )}
          <button
            className={mustVerify ? "primary" : "secondary"}
            onClick={startVerify}
            disabled={busy || !state.canVerify}
          >
            {mustVerify ? "Verify with Roblox" : "No, this isn't me"}
          </button>
        </div>

        {!mustVerify && (
          <p className="muted identity-note">
            Choosing no takes you to Roblox to sign in, and updates your staff profile
            to the account you sign in with.
          </p>
        )}
      </div>
    </div>
  );
}
