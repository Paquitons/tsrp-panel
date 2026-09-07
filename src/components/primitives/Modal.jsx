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
 *
 * The setup effect runs on mount and unmount ONLY. It used to depend on
 * `onClose`, and every call site writes that inline
 * (`onClose={() => setThingOpen(false)}`), so it was a new function on
 * every render of the parent. Any parent that re-renders on its own --
 * the Dashboard does, on every push from the live event stream -- tore
 * the effect down and set it up again, and setting it up moves focus to
 * the first focusable element in the dialog. Somebody typing into a
 * search field inside a modal got one character in before focus jumped to
 * the Close button. Both callbacks are read through refs instead, so the
 * latest one is always used without the effect depending on its identity.
 */
export default function Modal({ onClose, className = "", children, labelledBy, closeOnBackdropClick = true, closeOnEscape = true }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Kept current on every render, read only from inside the effect below.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeOnEscapeRef = useRef(closeOnEscape);
  closeOnEscapeRef.current = closeOnEscape;

  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? dialog)?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (closeOnEscapeRef.current) {
          e.stopPropagation();
          onCloseRef.current();
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
    // Mount and unmount only -- see the note above the component.
  }, []);

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
