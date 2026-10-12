import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    env: {
      SESSION_SECRET: 'clave_de_prueba_segura_de_al_menos_32_caracteres_vitest',
    },
  },
  resolve: {
    alias: {
      '@server': path.resolve(import.meta.dirname, './src/server'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@client': path.resolve(import.meta.dirname, './src/client'),
    },
  },
});
