import { useLayoutEffect, useRef } from "react";

// Grows/shrinks with its content instead of staying a fixed number of rows
// and scrolling internally -- drop-in replacement for a plain <textarea>.
export default function AutoGrowTextarea({ rows = 2, ...props }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);

  return <textarea ref={ref} rows={rows} {...props} />;
}
