import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The local proxy avoids browser CORS issues while testing with Valhalla.
// For production, provide an equivalent /routing reverse proxy of your own.
const routingProxy = {
  '/routing': {
    target: 'https://valhalla1.openstreetmap.de',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/routing/, ''),
    headers: { 'X-Client-Id': 'london-walks-lab-local-prototype' }
  }
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: routingProxy },
  preview: { port: 4173, proxy: routingProxy }
});
