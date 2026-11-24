import { test, expect } from '@playwright/test';
import { AUTH_STORAGE_STATE_PATH } from '../lib/constants/authStorageStatePath';
import { LoginPage } from '../lib/pom/loginPage';

test('Create the core CRM workspace from an empty Worker', async ({ page }) => {
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await page.goto('/welcome');
  await loginPage.clickLoginWithEmailIfVisible();
  await loginPage.typeEmail(
    process.env.DEFAULT_LOGIN ?? 'crm-e2e@example.test',
  );
  await loginPage.clickContinueButton();
  await loginPage.typePassword(
    process.env.DEFAULT_PASSWORD ?? 'E2e-test-password-2026!',
  );
  await loginPage.clickSignUpButton();
  await expect(page.getByText('Create your workspace')).toBeVisible();
  await loginPage.typeWorkspaceName('Worker CRM');
  const subdomain = page.getByLabel('Subdomain', { exact: true });
  if (await subdomain.isVisible()) await subdomain.fill('worker-crm');
  await loginPage.clickCreateWorkspaceButton();
  await expect(page.getByTestId('onboarding-create-profile-step')).toBeVisible({
    timeout: 60_000,
  });
  await loginPage.typeFirstName('Ada');
  await loginPage.typeLastName('Lovelace');
  await loginPage.clickContinueButton();
  await expect(page.getByTestId('onboarding-invite-team-step')).toBeVisible();
  await loginPage.clickSkipOnboardingStep();
  await expect(page.getByTestId('workspace-dropdown')).toBeVisible();
  await page.context().storageState({ path: AUTH_STORAGE_STATE_PATH });
});
