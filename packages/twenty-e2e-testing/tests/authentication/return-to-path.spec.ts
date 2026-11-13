import { test, expect } from '@playwright/test';
import { LoginPage } from '../../lib/pom/loginPage';

test.use({ storageState: { cookies: [], origins: [] } });

for (const path of [
  '/settings/profile',
  '/settings/profile?tab=profile&filter=active',
]) {
  test(`preserves ${path} across login`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto(path);
    await page.waitForURL('**/welcome**');
    await loginPage.clickLoginWithEmailIfVisible();
    await loginPage.typeEmail(
      process.env.DEFAULT_LOGIN ?? 'crm-e2e@example.test',
    );
    await loginPage.clickContinueButton();
    await loginPage.typePassword(
      process.env.DEFAULT_PASSWORD ?? 'E2e-test-password-2026!',
    );
    await loginPage.clickSignInButton();
    await expect(page).toHaveURL(
      (url) => `${url.pathname}${url.search}` === path,
    );
  });
}
