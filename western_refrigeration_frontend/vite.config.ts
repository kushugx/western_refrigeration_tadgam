import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/masters': 'http://127.0.0.1:8000',
      '/reports': 'http://127.0.0.1:8000',
      '/gopro': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/upload-image': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
      '/captures': 'http://127.0.0.1:8000',
    }
  }
})
