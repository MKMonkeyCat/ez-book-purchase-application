import 'dotenv/config';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: process.env.NODE_ENV === 'production' ? true : undefined,
  },
  server: {
    allowedHosts: process.env.VITE_DEV_SERVER_ALLOWED_HOSTS?.split(',').map(
      (host) => host.trim(),
    ),
  },
  build: {
    rollupOptions: isSsrBuild ? { input: './server/app.ts' } : undefined,
  },
}));
