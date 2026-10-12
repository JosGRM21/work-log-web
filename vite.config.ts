import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src/client'),
            '@client': path.resolve(import.meta.dirname, './src/client'),
            '@shared': path.resolve(import.meta.dirname, './src/shared'),
            '@server': path.resolve(import.meta.dirname, './src/server'),
        },
    },
});