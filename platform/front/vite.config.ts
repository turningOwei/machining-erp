import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/platform/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.CLAUDE_API_KEY': JSON.stringify(env.CLAUDE_API_KEY),
      'process.env.CLAUDE_API_URL': JSON.stringify(env.CLAUDE_API_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:28080',
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: false,
    },
    esbuild: {
      drop: ['console', 'debugger'],
      legalComments: 'none',
    },
  };
});
