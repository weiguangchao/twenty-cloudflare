import { expect, test } from '@playwright/test';

test('requests a password reset from the profile with legacy Turnstile settings', async ({
  page,
}) => {
  await page.route('**/client-config?*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: {
        ...(await response.json()),
        captcha: { provider: 'TURNSTILE', siteKey: 'legacy-site-key' },
      },
    });
  });

  await page.goto('/settings/profile');
  const passwordButton = page.getByRole('button', {
    name: 'Change Password',
    exact: true,
  });
  await expect(passwordButton).toBeVisible();
  await expect(
    page.locator('script[src*="challenges.cloudflare.com/turnstile"]'),
  ).toHaveCount(0);

  const resetRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith('/metadata') &&
      request.postData()?.includes('EmailPasswordResetLink') === true,
  );
  await passwordButton.click();
  expect((await resetRequest).postDataJSON().variables).not.toHaveProperty(
    'captchaToken',
  );
});
