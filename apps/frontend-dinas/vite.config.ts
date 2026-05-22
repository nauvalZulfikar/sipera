import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT ?? 5173),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
  },
});
