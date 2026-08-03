import { test, expect } from '@playwright/test';

// Placeholder until real e2e specs exist (those will need the CI job to also
// start the backend and `ng serve` before Playwright can drive the app).
test('placeholder smoke test', async () => {
  expect(1 + 1).toBe(2);
});
