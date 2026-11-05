import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative paths so the build runs from any static host or sub-folder.
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
