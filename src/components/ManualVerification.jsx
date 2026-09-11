import { useState } from "react";
import { apiFetch } from "../api";
import Banner from "./primitives/Banner";

// ==================================================================
// The alternative verification route.
//
// Roblox will not run an OAuth flow for an account under 13, so this is
// how those staff members prove their account: a one-time sentence, put
// in that account's Roblox profile description, read back from Roblox by
// the server.
//
// It is a plain English sentence rather than a code because Roblox filters
// accounts under 13 against a whitelist -- text is removed unless it is
// recognised. A random token came back as hashes, and so did a string of
// unrelated words. See manualVerificationShared.js on the API side.
//
// This component only exists on screen when the identity response carried
// a manualVerification object, which the API includes only for somebody a
// Director has opened it for. Everything here is a form and a status
// line: the code is generated server side, the account is resolved server
// side, and the check reads Roblox server side. Nothing this file sends
// decides anything, and every endpoint it calls answers 404 without the
// grant, so editing it in a browser gets you a 404 rather than a
// verification.
// ==================================================================

function fmtRemaining(ms) {
  if (ms <= 0) return "expired";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "under a minute";
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

export default function ManualVerification({ state, onVerified }) {
  const [open, setOpen] = useState(!!state.challenge);
  const [username, setUsername] = useState(state.challenge?.account?.username ?? "");
  const [challenge, setChallenge] = useState(state.challenge ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [copied, setCopied] = useState(false);

  async function start(e) {
    e?.preventDefault();
    setBusy(true); setError(null); setNote(null);
    try {
      const { challenge: c } = await apiFetch("/identity/manual/start", {
        method: "POST",
        body: { robloxUsername: username },
      });
      setChallenge(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setBusy(true); setError(null); setNote(null);
    try {
      const result = await apiFetch("/identity/manual/check", { method: "POST" });
      setNote(
        result.discordApplied
          ? "Verified. You can remove the sentence from your Roblox profile now."
          : "Verified, but your Discord nickname and roles could not be updated. Tell a Director. You can remove the sentence from your Roblox profile now."
      );
      // Re-reads the gate, which is what actually lets them through. The
      // panel does not decide that; it just asks again.
      setTimeout(onVerified, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function startOver() {
    setBusy(true); setError(null); setNote(null);
    try {
      await apiFetch("/identity/manual/cancel", { method: "POST" });
      setChallenge(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(challenge.code).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => { /* clipboard blocked -- the sentence is on screen to copy by hand */ }
    );
  }

  if (!open) {
    return (
      <div className="mv-wrap">
        <button type="button" className="link-button mv-open" onClick={() => setOpen(true)}>
          Can't use Roblox sign in?
        </button>
      </div>
    );
  }

  return (
    <div className="mv-wrap mv-panel">
      <h2 className="mv-title">Verify with a profile code</h2>
      <p className="muted mv-intro">
        A Director has enabled this for you because Roblox sign in isn't available on your
        account. You'll put a one-time sentence in your Roblox profile, and we'll read it back
        from Roblox to prove the account is yours.
      </p>

      {error && <Banner variant="error">{error}</Banner>}
      {note && <Banner variant="success">{note}</Banner>}

      {!challenge ? (
        <form className="mv-form" onSubmit={start}>
          <label className="mv-field">
            <span>Your Roblox username</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. pawcoo"
              autoComplete="off"
              maxLength={30}
              disabled={busy}
            />
          </label>
          <button className="primary" type="submit" disabled={busy || !username.trim()}>
            {busy ? "Checking…" : "Get my sentence"}
          </button>
        </form>
      ) : (
        <>
          <p className="mv-account">
            Proving <strong>{challenge.account.username}</strong>
            <span className="muted"> (Roblox ID {challenge.account.robloxId})</span>
          </p>

          <ol className="mv-steps">
            <li>Open Roblox and go to your profile.</li>
            <li>Edit your About / Description.</li>
            <li>Paste this sentence anywhere in it, then save:</li>
          </ol>

          <div className="mv-code-row">
            <code className="mv-code">{challenge.code}</code>
            <button type="button" className="secondary small" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <p className="muted mv-expiry">
            Copy the whole sentence exactly, every word, in this order. It works for{" "}
            {fmtRemaining(challenge.expiresAt - Date.now())} and only for this account.
            Don't share it.
          </p>

          <div className="identity-actions">
            <button className="primary" onClick={check} disabled={busy}>
              {busy ? "Checking Roblox…" : "Check my profile"}
            </button>
            <button className="secondary" onClick={startOver} disabled={busy}>
              Wrong account
            </button>
          </div>
        </>
      )}
    </div>
  );
}
