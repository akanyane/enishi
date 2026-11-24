import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API runs on its own port; proxy so the browser sees a single origin.
    proxy: {
      "/api": `http://localhost:${process.env.API_PORT ?? 5000}`,
    },
  },
});
