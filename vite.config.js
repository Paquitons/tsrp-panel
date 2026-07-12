import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base must match the repo name since this deploys to
// https://paquitons.github.io/tsrp-panel/ (a project site, not a root
// username.github.io site) -- without this, all asset paths break.
export default defineConfig({
  plugins: [react()],
  base: "/tsrp-panel/",
});
