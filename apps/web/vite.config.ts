import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@momentos/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@assets': path.resolve(__dirname, '../../assets'),
      '@fonts': path.resolve(__dirname, '../../font'),
    },
  },
  server: {
    port: 5173,
    open: false,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
});
