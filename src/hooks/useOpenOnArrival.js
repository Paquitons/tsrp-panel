// ==================================================================
// "?do=..." ON ARRIVAL
//
// The command palette can send somebody to a page AND ask it to open
// something once they get there: /management?do=staffmsg lands on
// Management with the Staff Messages tab already selected, rather than on
// whatever tab it opens by default, leaving them to find it themselves.
//
// The query parameter is the channel because it survives the things a
// shared React state would not: a full page load, a bookmark, a link
// pasted into Discord. "Open the panel on the BOLO queue" is a useful
// thing to be able to send somebody.
//
// It is consumed on arrival and stripped from the URL with a REPLACE, so
// the address bar goes back to the plain page and Back does not walk you
// through the same instruction a second time.
// ==================================================================
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * @param handler  called once with the `do` value, if there is one.
 *                 Should be stable or cheap; it runs on arrival only.
 */
export function useOpenOnArrival(handler) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const what = params.get("do");
    if (!what) return;

    handler(what);

    params.delete("do");
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "" }, { replace: true });
    // Keyed on the search string: the same page can be asked to open a
    // different thing without a remount, and re-running for an unchanged
    // URL would fight the cleanup above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);
}
