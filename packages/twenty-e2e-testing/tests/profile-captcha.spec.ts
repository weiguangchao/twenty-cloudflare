import { expect, test } from '@playwright/test';

for (const [scenario, siteKey] of [
  ['automatic verification', '1x00000000000000000000AA'],
  ['interactive verification', '3x00000000000000000000FF'],
] as const) {
  test(`keeps profile ${scenario} next to the password action`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.route('**/client-config?*', async (route) => {
      const response = await route.fetch();
      const configuration = await response.json();
      await route.fulfill({
        response,
        json: {
          ...configuration,
          captcha: { provider: 'TURNSTILE', siteKey },
        },
      });
    });

    await page.goto('/settings/profile');
    const passwordButton = page.getByRole('button', {
      name: 'Change Password',
      exact: true,
    });
    await expect(passwordButton).toBeVisible();
    const challenge = page.locator('#captcha-widget');
    const responseToken = page.locator('input[name="cf-turnstile-response"]');
    await expect(responseToken).toHaveCount(1, { timeout: 15_000 });
    await expect(passwordButton.locator('..')).toContainText('Change Password');
    await expect(
      passwordButton.locator('..').locator('#captcha-widget'),
    ).toHaveCount(1);

    if (scenario === 'interactive verification') {
      await expect(challenge).toBeVisible({ timeout: 15_000 });
      await challenge.scrollIntoViewIfNeeded();
      const buttonBounds = await passwordButton.boundingBox();
      const challengeBounds = await challenge.boundingBox();
      expect(challengeBounds!.y).toBeGreaterThan(buttonBounds!.y);
      expect(challengeBounds!.y - buttonBounds!.y).toBeLessThan(120);
      await page.screenshot({
        path: 'run_results/profile-captcha-interactive-challenge.png',
        fullPage: true,
      });
      // Turnstile renders its checkbox inside a closed shadow root.
      await challenge.click({ position: { x: 30, y: 32 } });
    }

    await expect(responseToken).not.toHaveValue('', { timeout: 15_000 });
    await expect(challenge).toBeHidden();
    await page.screenshot({
      path: `run_results/profile-captcha-${scenario.split(' ')[0]}-completed.png`,
      fullPage: true,
    });

    const submission = page.waitForRequest(
      (request) =>
        request.url().endsWith('/metadata') &&
        request.postData()?.includes('EmailPasswordResetLink') === true,
    );
    await passwordButton.click();
    expect(
      (await submission).postDataJSON().variables.captchaToken,
    ).toBeTruthy();

    await page.getByRole('link', { name: 'Experience', exact: true }).click();
    await expect(page.locator('#captcha-widget')).toHaveCount(0);
    await page.getByRole('link', { name: 'Profile', exact: true }).click();
    await expect(responseToken).toHaveCount(1);
  });
}
