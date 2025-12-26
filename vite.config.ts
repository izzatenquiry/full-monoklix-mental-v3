import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Load .env files in the current working directory, and filter for VITE_ prefixes.
  const env = loadEnv(mode, process.cwd(), '');

  // Create a process.env-like object for the client-side code.
  const processEnv: { [key: string]: string } = {};
  for (const key in env) {
    if (key.startsWith('VITE_')) {
      processEnv[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  }
  // Also expose the NODE_ENV
  processEnv['process.env.NODE_ENV'] = JSON.stringify(mode);


  return {
    plugins: [react()],
    // This 'define' block replaces occurrences of 'process.env.VAR' in the code
    // with the actual values at build time.
    define: processEnv,
    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 8080,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});