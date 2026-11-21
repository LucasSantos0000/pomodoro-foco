import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base relativa para permitir publicar o build em qualquer subcaminho (ex.: GitHub Pages)
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
