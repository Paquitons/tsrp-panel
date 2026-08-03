// Cycles through the brand's existing gradient pairs (same ones used for
// buttons elsewhere) so each changelog card/banner gets a distinct color
// without needing per-post artwork.
const GRADIENTS = [
  "linear-gradient(135deg, var(--btn-blue-1), var(--btn-blue-2))",
  "linear-gradient(135deg, var(--btn-green-1), var(--btn-green-2))",
  "linear-gradient(135deg, var(--btn-orange-1), var(--btn-orange-2))",
  "linear-gradient(135deg, var(--btn-pink-1), var(--btn-pink-2))",
];

export function colorForIndex(index) {
  return GRADIENTS[index % GRADIENTS.length];
}
