import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    target: 'esnext'
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        shop: resolve(__dirname, 'shop.html'),
        categories: resolve(__dirname, 'categories.html'),
        category: resolve(__dirname, 'category.html'),
        search: resolve(__dirname, 'search.html'),
        cart: resolve(__dirname, 'cart.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        orderConfirmation: resolve(__dirname, 'order-confirmation.html'),
        wishlist: resolve(__dirname, 'wishlist.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        product: resolve(__dirname, 'product.html'),
        admin: resolve(__dirname, 'admin.html'),
        blog: resolve(__dirname, 'blog.html'),
        blogPost: resolve(__dirname, 'blog-post.html'),
        mysteryVault: resolve(__dirname, 'mystery-vault.html'),
        rewards: resolve(__dirname, 'rewards.html'),
        track: resolve(__dirname, 'track.html'),
        verify: resolve(__dirname, 'verify.html')
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
});