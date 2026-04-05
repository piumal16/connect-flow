import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: [".up.railway.app"],
    hmr: {
      host: "localhost",
      port: 3000,
      protocol: "ws",
    },
    middlewareMode: false,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    exclude: [
      "lovable-tagger",
      "@vitejs/plugin-react-swc",
    ],
  },
}));
