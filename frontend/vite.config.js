import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://skilltwinai.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep React AND Clerk together in the same vendor chunk
          // so Clerk can always find React's useState/useEffect
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('@clerk')
            ) {
              return 'react-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
    minify: 'esbuild',
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@clerk/clerk-react'],
  },
});