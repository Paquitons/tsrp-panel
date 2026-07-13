import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders `children` in a fixed-position portal anchored to `anchorRef`,
 * escaping any scrolling ancestor's overflow clipping. Use for any dropdown
 * or floating panel that needs to reliably show its full content instead of
 * being cut off by whatever scrollable container happens to hold it.
 */
export default function PortalDropdown({ anchorRef, open, onClose, align = "left", matchWidth = true, children, className = "" }) {
  const [coords, setCoords] = useState(null);
  const dropdownRef = useRef(null);

  function computeCoords() {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 4,
      left: align === "right" ? undefined : rect.left,
      right: align === "right" ? window.innerWidth - rect.right : undefined,
      width: matchWidth ? rect.width : undefined,
    });
  }

  useLayoutEffect(() => {
    if (open) computeCoords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    function onReposition() { computeCoords(); }

    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !coords) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className={`portal-dropdown ${className}`}
      style={{ top: coords.top, left: coords.left, right: coords.right, width: coords.width }}
    >
      {children}
    </div>,
    document.body
  );
}
