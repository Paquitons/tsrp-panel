// ==================================================================
// The bot's "open the Staff Panel" button
//
// The DM that enables alternative verification links here with ?manual=1,
// so somebody who was told to use that route lands on it instead of on
// the Roblox button they already know does not work for them.
//
// The catch is that they are usually signed out when they click it. That
// means a round trip to Discord and back, and the backend's callback
// redirects to the panel root with no query string, so the parameter is
// gone by the time anything that cares about it renders. Reading it where
// it is used never worked for the one case it exists for.
//
// So it is captured here instead: at module load, before React renders,
// on every page load whether signed in or not. It goes into
// sessionStorage, which survives the Discord round trip (same tab, same
// origin) and dies with the tab, and it is taken straight back out of the
// URL so a refresh or a bookmark does not carry it around.
//
// Deliberately its own parameter and not ?verify=, which the identity
// gate already uses for OAuth outcomes and which renders anything it does
// not recognise as a failure banner.
// ==================================================================
const KEY = "tsrp_manual_verify";

/** Called once at startup, before anything renders. */
export function captureManualDeepLink() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("manual") !== "1") return;

    sessionStorage.setItem(KEY, "1");
    params.delete("manual");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  } catch {
    // A browser with site data blocked. The panel still works; they just
    // have to open the section themselves, which the DM also tells them
    // how to do.
  }
}

/**
 * True if this tab arrived from the DM. Consumed on read: it decides which
 * section is open when the gate first renders, and re-opening it on every
 * later render would fight somebody who deliberately closed it.
 */
export function consumeManualDeepLink() {
  try {
    if (sessionStorage.getItem(KEY) !== "1") return false;
    sessionStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
