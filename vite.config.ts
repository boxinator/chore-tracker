import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const clientPort = Number(process.env.VITE_PORT ?? 5173);
const apiPort = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: clientPort,
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "client-dist"
  }
});
