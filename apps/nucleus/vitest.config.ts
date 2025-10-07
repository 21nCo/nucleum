import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // Allow Vitest to pass when no tests are present
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom'
  }
});