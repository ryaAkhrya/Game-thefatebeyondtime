import { defineConfig } from 'vitest/config';

// Semua cache/artefak development berada di drive D: (folder .dev-cache di root proyek).
export default defineConfig({
  base: './', // static export: bisa di-host di subfolder mana pun
  cacheDir: '../.dev-cache/vite',
  server: { host: '127.0.0.1', port: 5173, strictPort: false },
  preview: { host: '127.0.0.1', port: 4173, strictPort: false },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Phaser sendiri ~1.5 MB; dipisah ke chunk sendiri supaya kode game kecil.
    chunkSizeWarningLimit: 2500,
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
