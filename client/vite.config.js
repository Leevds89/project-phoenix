import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const configFile = fileURLToPath(import.meta.url);
const clientDir = path.dirname(configFile);
const rootDir = path.resolve(clientDir, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const port = Number.parseInt(env.CLIENT_PORT || '5173', 10);
  const serverPort = Number.parseInt(env.PORT || '3001', 10);
  return {
    root: clientDir,
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${serverPort}`,
          changeOrigin: true,
        },
      },
    },
    preview: { host: '127.0.0.1' },
  };
});
