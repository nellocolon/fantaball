import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Only variables prefixed with VITE_ are exposed to client code via import.meta.env.
  // This is critical to prevent Netlify's secrets scanner from flagging non-public values.
  envPrefix: 'VITE_',
  // Prevent accidental inlining of process.env.* (which would leak any non-VITE_ vars present at build time).
  define: {
    'process.env': '({})',
  },
  server: { port: 5173, open: true },
  build: { outDir: "dist", sourcemap: false },
});
