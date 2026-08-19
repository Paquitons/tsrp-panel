import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]", "button:not([disabled])", "textarea:not([disabled])",
  "input:not([disabled])", "select:not([disabled])", "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

/**
 * Drop-in replacement for the hand-rolled
 * `<div className="modal-backdrop" onClick={onClose}><div className="modal
 * X" onClick={e => e.stopPropagation()}>...</div></div>` pattern repeated
 * across ~16 components -- same markup, same CSS classes (.modal-backdrop/
 * .modal), so migrating a call site is just swapping the wrapper. What this
 * adds on top: a real focus trap (Tab/Shift+Tab cycle within the dialog
 * instead of escaping into the page behind it), Escape-to-close, proper
 * role="dialog"/aria-modal, focus restored to whatever triggered the modal
 * on close, and a body scroll lock while open. None of the existing modals
 * had any of this.
 */
export default function Modal({ onClose, className = "", children, labelledBy, closeOnBackdropClick = true, closeOnEscape = true }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? dialog)?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (closeOnEscape) {
          e.stopPropagation();
          onClose();
        }
        return;
      }
      if (e.key !== "Tab") return;

      const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
      // The trigger element may have unmounted (e.g. the row that opened
      // this modal got removed by the same action) -- guard rather than
      // throw trying to refocus something that's gone.
      if (previouslyFocused.current?.isConnected) previouslyFocused.current.focus();
    };
  }, [onClose, closeOnEscape]);

  return (
    <div className="modal-backdrop" onClick={closeOnBackdropClick ? onClose : undefined}>
      <div
        ref={dialogRef}
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
