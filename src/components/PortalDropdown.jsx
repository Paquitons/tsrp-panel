import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import useAnchoredPosition from "../hooks/useAnchoredPosition";

/**
 * Renders `children` in a fixed-position portal anchored to `anchorRef`,
 * escaping any scrolling ancestor's overflow clipping. Use for any dropdown
 * or floating panel that needs to reliably show its full content instead of
 * being cut off by whatever scrollable container happens to hold it.
 */
export default function PortalDropdown({ anchorRef, open, onClose, align = "left", matchWidth = true, children, className = "" }) {
  const dropdownRef = useRef(null);
  // Placement, flipping and the height cap all live in the hook, shared
  // with CustomSelect so the two cannot drift apart on where a panel is
  // allowed to go. See useAnchoredPosition for what it fixes.
  const coords = useAnchoredPosition({ anchorRef, panelRef: dropdownRef, open, align, matchWidth });

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (
        anchorRef.current && !anchorRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        onClose?.();
      }
    }
    // Previously had no keyboard dismissal at all -- children vary widely
    // (autocomplete lists, filter checkboxes, custom pickers) so this
    // doesn't impose a fixed listbox/option ARIA pattern the way
    // CustomSelect does, but every one of those content types shares the
    // same expectation that Escape closes a floating panel without
    // requiring a mouse click elsewhere.
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className={`portal-dropdown ${className}`}
      data-placement={coords?.placement}
      style={{
        top: coords?.top,
        left: coords?.left,
        right: coords?.right,
        width: coords?.width,
        maxHeight: coords?.maxHeight,
        maxWidth: coords?.maxWidth,
        // Hidden for the frame before the first measurement (it has to
        // be in the DOM to be measured), and hidden again whenever the
        // trigger has scrolled out of sight, so the panel never floats
        // detached over the rest of the page. pointerEvents goes with
        // it: something invisible must not still be clickable.
        visibility: !coords || coords.hidden ? "hidden" : undefined,
        pointerEvents: coords?.hidden ? "none" : undefined,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
