import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      "a2ui-core": path.resolve(__dirname, "../a2ui-core/src"),
      "a2ui-react": path.resolve(__dirname, "./src")
    }
  }
});

