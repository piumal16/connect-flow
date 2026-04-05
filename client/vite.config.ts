import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const railwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: [".up.railway.app"],
    hmr: railwayPublicDomain
      ? {
          host: railwayPublicDomain,
          protocol: "wss",
          clientPort: 443,
        }
      : undefined,
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
