import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          uiVendor: ['framer-motion', 'lucide-react', '@headlessui/react'],
          dataVendor: ['@supabase/supabase-js', 'react-hot-toast'],
          chartVendor: ['recharts'],
        },
      },
    },
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
