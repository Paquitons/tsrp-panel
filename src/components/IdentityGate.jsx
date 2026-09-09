import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api";
import Banner from "./primitives/Banner";

// ==================================================================
// The identity gate.
//
// Two questions, and which one somebody gets depends on whether Roblox
// has ever proved their account.
//
//   Never verified   They sign in with Roblox. They are not shown an
//                    account and not asked to confirm one, because
//                    nothing about them has been proved yet and asking
//                    somebody to vouch for a guess teaches them to click
//                    yes.
//   Verified         "Is this you?", showing the account Roblox proved,
//                    once per login. Yes carries on. No takes their
//                    access away and sends them to Roblox.
//
// Nothing here decides anything. The server recomputes the same answer on
// every protected request and refuses with a 403 if it disagrees, so this
// component is how somebody is told what to do, not what stops them. That
// is also why it fails closed: if the check cannot run, the panel is not
// opened on the assumption that it would probably have been fine, because
// the API would refuse every request behind it anyway.
// ==================================================================

const OUTCOMES = {
  ok:        { variant: "success", text: "Your Roblox account has been verified." },
  changed:   { variant: "success", text: "Verified. The Roblox account on your staff profile has been updated." },
  partial:   { variant: "warning", text: "Verified, but your Discord nickname and roles could not be updated. Tell an administrator." },
  cancelled: { variant: "warning", text: "You cancelled the Roblox sign in, so nothing changed." },
  expired:   { variant: "warning", text: "That verification link expired. Please try again." },
  conflict:  { variant: "error",   text: "That Roblox account is already linked to another staff member. Nothing was changed. Speak to management." },
  failed:    { variant: "error",   text: "Roblox could not confirm that sign in. Please try again." },
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const outcome = useVerifyOutcome();

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      setState(await apiFetch("/identity/me"));
    } catch {
      // Fail closed. Every protected route is behind the same check
      // server side, so opening the panel here would only produce a panel
      // whose every request is refused.
      setState(null);
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => { load(); }, [load, outcome]);

  // Any request refused for identity reasons re-asks the question, so a
  // tab left open through a forced re-verification catches up rather than
  // showing a wall of failures.
  useEffect(() => {
    const onRequired = () => load();
    window.addEventListener("tsrp:identity-required", onRequired);
    return () => window.removeEventListener("tsrp:identity-required", onRequired);
  }, [load]);

  async function confirm() {
    setBusy(true); setError(null);
    try {
      await apiFetch("/identity/confirm", { method: "POST" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function startVerify({ reject = false } = {}) {
    setBusy(true); setError(null);
    try {
      // Saying no takes their access away first, so cancelling at Roblox,
      // closing the tab or coming back tomorrow all leave them here rather
      // than back at a prompt they can answer yes to.
      if (reject) await apiFetch("/identity/reject", { method: "POST" });
      const { authorizeUrl } = await apiFetch("/identity/verify/start", { method: "POST" });
      window.location.href = authorizeUrl;
    } catch (err) {
      setError(err.message);
      setBusy(false);
      if (reject) load();
    }
  }

  if (loadFailed) {
    return (
      <div className="identity-gate">
        <div className="identity-card">
          <h1>Couldn't check your account</h1>
          <Banner>We couldn't reach the staff panel to check your Roblox verification.</Banner>
          <p className="muted identity-note">
            This is usually a connection problem. If it keeps happening, tell an administrator.
          </p>
          <div className="identity-actions">
            <button className="primary" onClick={load}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  // Still checking.
  if (!state) return null;

  if (state.allowed) {
    return (
      <>
        {outcome && <div className="identity-toast-wrap"><Banner variant={outcome.variant}>{outcome.text}</Banner></div>}
        {children}
      </>
    );
  }

  const mustVerify = state.action === "verify";

  return (
    <div className="identity-gate">
      <div className="identity-card">
        <h1>{mustVerify ? "Verify your Roblox account" : "Is this you?"}</h1>

        {outcome && <Banner variant={outcome.variant}>{outcome.text}</Banner>}

        {mustVerify ? (
          <>
            <p className="muted">
              {state.reason || "Your Roblox account needs to be verified before you can continue."}
            </p>
            <p className="muted identity-note">
              You will sign in with Roblox. We never see your password, and we cannot
              act on your account.
            </p>
          </>
        ) : (
          <>
            <p className="muted">This is the Roblox account on your staff profile.</p>
            <Account account={state.account} />
          </>
        )}

        {error && <Banner>{error}</Banner>}
        {!state.canVerify && (
          <Banner variant="error">
            Roblox sign in isn't set up on this server, so this can't be completed right now.
            Tell an administrator.
          </Banner>
        )}

        <div className="identity-actions">
          {!mustVerify && (
            <button className="primary" onClick={confirm} disabled={busy}>
              {busy ? "Saving…" : "Yes, this is me"}
            </button>
          )}
          <button
            className={mustVerify ? "primary" : "secondary"}
            onClick={() => startVerify({ reject: !mustVerify })}
            disabled={busy || !state.canVerify}
          >
            {mustVerify ? "Verify with Roblox" : "No, this isn't me"}
          </button>
        </div>

        {!mustVerify && (
          <p className="muted identity-note">
            Choosing no signs you out of the panel until you verify with Roblox, and
            updates your staff profile to the account you sign in with.
          </p>
        )}
      </div>
    </div>
  );
}
