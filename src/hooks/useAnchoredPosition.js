import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// How close a floating panel may come to the edge of the viewport.
const VIEWPORT_MARGIN = 8;

/**
 * Positions a fixed-position floating panel against its trigger, so that
 * it stays inside the viewport and every option in it can be reached.
 *
 * ---- Why a panel could run off the bottom of the screen ----
 * Both dropdowns used to place themselves at `trigger.bottom + 4` and
 * stop there, with a flat max-height in CSS. A trigger low on the page
 * therefore opened a panel that carried on past the bottom edge, and
 * because the panel is position:fixed, the part hanging off was
 * unreachable: scrolling the page does not move a fixed element, and the
 * panel's own overflow only scrolls content past its max-height, not the
 * part rendered outside the viewport. The options at the end simply could
 * not be gotten to.
 *
 * So the height is decided here rather than in a stylesheet. The panel
 * takes whichever side of the trigger has more room, and is capped at the
 * space actually available on that side. Its own overflow-y then covers
 * the rest, which it can now do because the whole panel is on screen.
 *
 * ---- Why scrolling was slow ----
 * Repositioning is driven by a capturing scroll listener, which fires for
 * every scrolling ancestor, and each event used to call setState with a
 * freshly built object. That re-rendered the panel on every scroll event
 * with no coalescing. Here each burst is collapsed into one
 * requestAnimationFrame, and the state is only replaced when a number
 * actually changed, so an open dropdown costs nothing while scrolling
 * past it.
 *
 * ---- Mobile ----
 * Measurements come from visualViewport where it exists. On a phone that
 * is the part of the page actually visible above the on-screen keyboard,
 * which window.innerHeight does not account for: without it, a panel
 * opened from a focused input is sized against a viewport the keyboard is
 * covering half of.
 */
/**
 * The rectangle the anchor is actually visible within: the viewport,
 * narrowed by every scrolling ancestor that clips it.
 *
 * A trigger inside one of the dashboard's scrolling columns can be
 * scrolled out of that column while still being within the window. Only
 * looking at the viewport would call it visible and leave a panel
 * pointing at a row that is no longer on screen.
 */
function clipRectFor(el, vpWidth, vpHeight) {
  let top = 0, left = 0, right = vpWidth, bottom = vpHeight;
  for (let node = el?.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    const clips = /(auto|scroll|hidden|clip)/.test(style.overflowY + style.overflowX);
    if (!clips) continue;
    const r = node.getBoundingClientRect();
    top = Math.max(top, r.top);
    left = Math.max(left, r.left);
    right = Math.min(right, r.right);
    bottom = Math.min(bottom, r.bottom);
  }
  return { top, left, right, bottom };
}

export function useAnchoredPosition({
  anchorRef,
  panelRef,
  open,
  align = "left",
  matchWidth = true,
  maxHeight = 320,
  gap = 4,
}) {
  const [coords, setCoords] = useState(null);
  const frameRef = useRef(0);

  const measure = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    const vpWidth = vv?.width ?? window.innerWidth;
    const vpHeight = vv?.height ?? window.innerHeight;

    // How tall the panel wants to be. scrollHeight is its natural
    // content height, so a short list is not given a 320px slot it does
    // not need, and is not flipped above the trigger for space it was
    // never going to use.
    const natural = panelRef?.current?.scrollHeight ?? maxHeight;
    const wanted = Math.min(maxHeight, natural);

    // Has the trigger itself scrolled out of sight?
    //
    // This is what produced a menu floating detached at the top of the
    // page over the header. The clamps below keep a panel on screen,
    // which is right while its trigger is on screen and wrong the moment
    // it is not: the panel got pinned to the top edge and stayed there,
    // anchored to a row that had scrolled away long before.
    //
    // The panel is hidden rather than closed. These host half-filled
    // filters and search boxes, and throwing that away because somebody
    // scrolled is worse than letting it come back when they scroll
    // return. Hidden also means not clickable, so it cannot be used
    // while pointing at something off screen.
    const clip = clipRectFor(anchorRef.current, vpWidth, vpHeight);
    const hidden =
      rect.bottom <= clip.top || rect.top >= clip.bottom ||
      rect.right <= clip.left || rect.left >= clip.right;

    const spaceBelow = vpHeight - rect.bottom - gap - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - gap - VIEWPORT_MARGIN;

    // Below unless it does not fit and there is genuinely more room
    // above. Equal space keeps it below, which is where a dropdown is
    // expected to be.
    const placeAbove = wanted > spaceBelow && spaceAbove > spaceBelow;
    const available = Math.max(0, placeAbove ? spaceAbove : spaceBelow);
    const height = Math.max(0, Math.min(wanted, available));

    const width = matchWidth ? rect.width : (panelRef?.current?.offsetWidth ?? 0);

    // Horizontal clamping matters on a narrow screen, where a trigger
    // near an edge would otherwise put half the panel off the side.
    let left;
    let right;
    if (align === "right") {
      right = Math.max(VIEWPORT_MARGIN, vpWidth - rect.right);
      if (width) right = Math.min(right, Math.max(VIEWPORT_MARGIN, vpWidth - width - VIEWPORT_MARGIN));
    } else {
      left = Math.max(VIEWPORT_MARGIN, rect.left);
      if (width) left = Math.min(left, Math.max(VIEWPORT_MARGIN, vpWidth - width - VIEWPORT_MARGIN));
    }

    return {
      hidden,
      // While hidden, the panel tracks the anchor exactly rather than
      // being clamped on screen. If it were clamped it would creep back
      // into view as a sliver at the edge the moment the maths rounded
      // the other way.
      top: hidden
        ? (placeAbove ? rect.top - gap - height : rect.bottom + gap)
        : (placeAbove ? Math.max(VIEWPORT_MARGIN, rect.top - gap - height) : rect.bottom + gap),
      left,
      right,
      width: matchWidth ? rect.width : undefined,
      maxHeight: height,
      maxWidth: vpWidth - VIEWPORT_MARGIN * 2,
      placement: placeAbove ? "above" : "below",
    };
  }, [anchorRef, panelRef, align, matchWidth, maxHeight, gap]);

  const apply = useCallback(() => {
    const next = measure();
    if (!next) return;
    // Replacing the object on every scroll event is what made scrolling
    // past an open dropdown expensive. Same numbers, same object.
    setCoords(prev => {
      if (prev
        && prev.top === next.top && prev.left === next.left && prev.right === next.right
        && prev.width === next.width && prev.maxHeight === next.maxHeight
        && prev.maxWidth === next.maxWidth && prev.placement === next.placement
        && prev.hidden === next.hidden) {
        return prev;
      }
      return next;
    });
  }, [measure]);

  const schedule = useCallback(() => {
    if (frameRef.current) return; // a frame is already pending
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      apply();
    });
  }, [apply]);

  // Before paint, so the panel never appears at a stale position first.
  useLayoutEffect(() => {
    if (!open) { setCoords(null); return; }
    apply();
  }, [open, apply]);

  // A second pass once the panel is mounted and its real height is
  // known. The first pass has to assume the maximum, because there is
  // nothing to measure yet.
  useLayoutEffect(() => {
    if (!open || !panelRef?.current) return;
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, coords === null]);

  useEffect(() => {
    if (!open) return;
    // Capture, so this follows the trigger inside any scrolling ancestor
    // and not just the document.
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [open, schedule]);

  // Content can change height while open: a filtered list shrinking, an
  // async list arriving. Without this the panel keeps the height it was
  // given when it opened.
  useEffect(() => {
    if (!open || !panelRef?.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(schedule);
    ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, [open, panelRef, schedule]);

  return coords;
}

export default useAnchoredPosition;
