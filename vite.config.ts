import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ImagePanZoom',
      fileName: 'image-pan-zoom',
      formats: ['es', 'umd', 'iife']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2
      },
      mangle: true,
      format: {
        comments: false
      }
    }
  },
  server: {
    host: true,
  },
});