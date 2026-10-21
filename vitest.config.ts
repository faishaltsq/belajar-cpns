import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // tests/e2e is Playwright: vitest must not try to collect those specs.
    // p2-11-payment-orders-schema.test.ts = OneDrive-locked remnant of a botched
    // overwrite; its real content lives in p2-11-schema.test.ts. Remove the
    // exclude + delete the file once the lock clears (it is 2 lines, harmless).
    exclude: ['**/node_modules/**', '**/dist/**', '.next/**', 'tests/e2e/**', 'tests/p2-11-payment-orders-schema.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
