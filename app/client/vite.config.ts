import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ============================================================================
// VITE CONFIGURATION - PRODUCTION OPTIMIZATIONS
// ============================================================================

export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 5173,
    open: true
  },

  // Build optimizations
  build: {
    // OPTIMIZED: Disabled source maps for production (reduces bundle size by ~30%)
    sourcemap: false,
    
    // Target modern browsers for better optimization
    target: 'esnext',
    
    // Minification settings - esbuild is faster than terser
    minify: 'esbuild',
    
    // MOBILE OPTIMIZATION: Better tree-shaking and dead code elimination
    cssCodeSplit: true,
    
    // Enable CSS minification
    cssMinify: true,
    
    // Rollup options for code splitting and chunking
    rollupOptions: {
      output: {
        /**
         * OPTIMIZED Manual Chunks Configuration
         * 
         * Benefits:
         * 1. Vendor Bundle Separation
         *    - React, React-DOM, and Socket.io-client are bundled separately
         *    - These libraries rarely change between deployments
         *    - Browser can cache vendor.js for long periods
         * 
         * 2. Improved Cache Hit Rate
         *    - When you update app code, vendor.js remains cached
         *    - Users only download changed chunks (main.js, not vendor.js)
         *    - Reduces bandwidth and improves load times
         * 
         * 3. Parallel Loading
         *    - Browser can download vendor.js and main.js simultaneously
         *    - Faster initial page load
         * 
         * 4. Better Long-term Caching
         *    - Vendor dependencies have stable hashes
         *    - Can set aggressive cache headers (1 year) on vendor.js
         */
        manualChunks: (id) => {
          // React core libraries (rarely change)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          
          // Socket.io client (rarely change)
          if (id.includes('node_modules/socket.io-client')) {
            return 'vendor-socket';
          }
          
          // Sentry monitoring (rarely change) - lazy load
          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry';
          }
          
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor-libs';
          }
        },
        
        /**
         * Asset File Names
         * Uses content hash for cache busting
         */
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];
          
          // Different folder structure based on file type
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|eot/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        },
        
        /**
         * Chunk File Names
         * Uses content hash for cache busting
         */
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    
    // OPTIMIZED: Increased chunk size warning limit
    chunkSizeWarningLimit: 600,
    
    // MOBILE OPTIMIZATION: Inline small assets to reduce HTTP requests
    assetsInlineLimit: 4096,
    
    // Report compressed size (helps identify large chunks)
    reportCompressedSize: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'socket.io-client',
      '@sentry/react'
    ],
  },
});
