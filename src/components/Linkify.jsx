// ============================================================
//  LINKIFY -- turns the URLs inside staff-authored text into links.
//
//  Used for notice bodies, where a director writing "read the update at
//  https://..." should produce something clickable rather than something
//  to be selected and pasted.
//
//  ---- Why this is not a markdown renderer ----
//
//  It deliberately handles one thing. The text comes from a person and is
//  shown to other people, so every feature here is a decision about what
//  a sender is allowed to make a reader's browser do, and "bare URLs
//  become links" is the whole of what was asked for.
//
//  ---- What makes it safe ----
//
//  React elements, never dangerouslySetInnerHTML, so nothing in the text
//  can become markup.
//
//  Only http and https are matched. That is what rules out the attack
//  this feature would otherwise introduce: a sender typing a
//  javascript: URL and a reader clicking it. There is no branch here
//  that takes an arbitrary scheme and puts it in an href, so there is
//  nothing to get wrong later.
//
//  External links open in a new tab with rel="noreferrer noopener", so
//  the opened page gets no handle on the panel through window.opener and
//  no referrer telling it where the reader came from.
//
//  A link back into the panel is routed through the router instead, so
//  "see /staff-handbook" does not throw away the session state and
//  reload the whole app.
// ============================================================
import { Link } from "react-router-dom";

// Bare http(s) URLs. The scheme is part of the pattern rather than
// optional: guessing that "example.com" is a link means guessing that
// "12.30" and "node.js" are not.
const URL_PATTERN = /(https?:\/\/[^\s<>"]+)/g;

// Punctuation that almost always belongs to the sentence rather than to
// the URL. Without this, "see https://tsrp.online." links to a 404.
const TRAILING = /[.,;:!?'"»)\]}]+$/;

/**
 * Splits a matched URL into the link itself and any sentence punctuation
 * that got swept up with it.
 *
 * Closing brackets are the awkward case, because they are equally likely
 * to be part of the URL (a wiki link) or to be closing a bracket the
 * sentence opened. Resolved by counting: a ")" is kept only when there is
 * an unclosed "(" inside the URL to match it.
 */
export function splitTrailingPunctuation(url) {
  const match = TRAILING.exec(url);
  if (!match) return [url, ""];

  let href = url.slice(0, url.length - match[0].length);
  let tail = match[0];

  for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
    while (tail.startsWith(close)) {
      const opens = href.split(open).length - 1;
      const closes = href.split(close).length - 1;
      if (opens <= closes) break;    // nothing left open, so the bracket is the sentence's
      href += close;
      tail = tail.slice(1);
    }
  }

  return [href, tail];
}

/** True if this URL points back into the panel itself. */
function isInternal(href) {
  try {
    return new URL(href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function LinkTo({ href, children }) {
  if (isInternal(href)) {
    const url = new URL(href);
    // Router navigation rather than a full page load: an internal link
    // should not tear down and rebuild the panel.
    return <Link to={`${url.pathname}${url.search}${url.hash}`}>{children}</Link>;
  }
  return <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>;
}

/**
 * The text, with its URLs as links. Everything else is returned as plain
 * text nodes, so whitespace and line breaks survive for a container
 * using white-space: pre-wrap.
 */
export default function Linkify({ text }) {
  const parts = String(text ?? "").split(URL_PATTERN);

  return (
    <>
      {parts.map((part, i) => {
        // split() with one capture group alternates text, match, text...
        // so every odd index is a URL and no re-test is needed.
        if (i % 2 === 0) return part;

        const [href, tail] = splitTrailingPunctuation(part);
        if (!href) return part; // nothing left once punctuation came off

        return (
          <span key={i}>
            <LinkTo href={href}>{href}</LinkTo>
            {tail}
          </span>
        );
      })}
    </>
  );
}
