import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base is "/" now since this deploys to the custom domain tsrp.online at
// the root, rather than the default paquitons.github.io/tsrp-panel/ subpath.
export default defineConfig({
  plugins: [react()],
  base: "/",
});
