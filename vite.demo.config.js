import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "demo",
  build: {
    outDir: "../dist-demo",
    emptyOutDir: true,
    assetsDir: "assets",
  },
  base: "./",
  define: {
    __LIB_PATH__: JSON.stringify("/image-pan-zoom.mjs"),
  },
  resolve: {
    alias: {
      "image-pan-zoom": resolve(__dirname, "src/index.ts"),
    },
  },
  server: {
    host: '192.168.3.13',
    port: 3000,
    watch: {
      usePolling: true
    }
  }
});
