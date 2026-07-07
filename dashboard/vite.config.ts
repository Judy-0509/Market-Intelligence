import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// https://vite.dev/config/
export default defineConfig({
  // viteSingleFile inlines all JS/CSS into one dist/index.html so the
  // built dashboard can be opened directly via file:// with no server.
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // single-file build: keep everything inline, no separate chunks
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
})
