import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // Uploaded files are served from the backend's /uploads/<file> static
      // mount. Without this proxy line, <img src="/uploads/..."> 404s in
      // dev (frontend runs on :5173, backend on :5000).
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
