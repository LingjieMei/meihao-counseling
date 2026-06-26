import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await viteBuild({
  configFile: false,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
      "@shared": path.resolve(projectRoot, "shared"),
      "@assets": path.resolve(projectRoot, "attached_assets"),
    },
  },
  envDir: projectRoot,
  root: path.resolve(projectRoot, "client"),
  publicDir: path.resolve(projectRoot, "client", "public"),
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
  },
});

