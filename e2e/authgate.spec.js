import { test, expect } from '@playwright/test';

const gotoHarness = async (page) => {
  await page.goto('/__dev/authgate');
  test.skip(
    !(await page.getByRole('heading', { name: 'AuthGate Harness' }).count()),
    'harness exists only in dev builds',
  );
};

test.describe('AI gate infrastructure', () => {
  test('guests see the auth modal and never run the guarded action', async ({ page }) => {
    await gotoHarness(page);
    await expect(page.getByTestId('auth-state')).toHaveText('guest');
    await expect(page.getByTestId('runs')).toHaveText('runs:0');

    await page.getByRole('button', { name: 'Run gated action' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('AI features require a free verified account. Please log in or sign up.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Free Account' })).toHaveAttribute('href', '/signup');
    await expect(page.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    await expect(page.getByTestId('runs')).toHaveText('runs:0');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: 'Run gated action' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('runs')).toHaveText('runs:0');
  });

  test('rate limiter blocks fast calls and survives a 429 without crashing', async ({ page }) => {
    await gotoHarness(page);

    // First call succeeds and stamps a 30s cooldown
    await page.getByRole('button', { name: 'Trigger AI call (ok)' }).click();
    await expect(page.getByTestId('result')).toHaveText('ok:asset-ok');
    await expect(page.getByTestId('cooldown')).not.toHaveText('cooldown:0');

    // Immediate second call is blocked client-side with the toast message
    await page.getByRole('button', { name: 'Trigger AI call (ok)' }).click();
    await expect(page.getByTestId('result')).toHaveText(/rate-limited:\d+/);
    await expect(page.getByRole('status').first()).toContainText(/Server is processing high volumes/);

    // A 429 is caught: toast shown, cooldown stamped, app stays alive
    await page.evaluate(() => localStorage.removeItem('next_ai_call_allowed_at'));
    await page.getByRole('button', { name: 'Trigger AI call (429)' }).click();
    await expect(page.getByTestId('result')).toHaveText('rate-limited:30');
    await expect(page.getByRole('status').first()).toContainText('Server is processing high volumes. Please wait 30 seconds.');

    // Still throttled after the 429 stamp
    await page.getByRole('button', { name: 'Trigger AI call (ok)' }).click();
    await expect(page.getByTestId('result')).toHaveText(/rate-limited:\d+/);

    // Clearing the stamp re-enables calls
    await page.evaluate(() => localStorage.removeItem('next_ai_call_allowed_at'));
    await page.getByRole('button', { name: 'Trigger AI call (ok)' }).click();
    await expect(page.getByTestId('result')).toHaveText('ok:asset-ok');
  });
});