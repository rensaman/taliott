import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.js'],
    globalSetup: ['tests/integration/docker-lifecycle.js'],
    setupFiles: ['tests/integration/setup.js'],
    pool: 'forks',
  },
});
