import { randomUUID } from 'crypto';
import { AUTH_STORAGE_STATE_PATH } from '../../lib/constants/authStorageStatePath';
import { LeftMenu } from '../../lib/pom/leftMenu';
import { MembersSection } from '../../lib/pom/settings/membersSection';
import { SettingsPage } from '../../lib/pom/settingsPage';
import { expect, test } from './fixture';

test.use({ storageState: { cookies: [], origins: [] } });

test('Sign up with invite link via email', async ({
  browser,
  baseURL,
  page,
  loginPage,
  leftMenu,
  settingsPage,
  profileSection,
  confirmationModal,
}) => {
  const email = `test${randomUUID().replaceAll('-', '')}@apple.dev`;
  const firstName = 'John';
  const lastName = 'Doe';

  const inviteLink: string =
    await test.step('Go to Settings and copy invite link', async () => {
      // Signing out or up from the saved session would revoke it server-side for later tests.
      const inviterPage = await browser.newPage({
        baseURL,
        storageState: AUTH_STORAGE_STATE_PATH,
        permissions: ['clipboard-read', 'clipboard-write'],
      });

      try {
        await inviterPage.goto('/settings/members#invite');
        const inviteSwitch = inviterPage.getByRole('switch', {
          name: 'Invite by Link',
        });
        await expect(inviteSwitch).toBeVisible();
        if (!(await inviteSwitch.isChecked())) await inviteSwitch.click();
        await inviterPage
          .getByRole('button', { name: 'Copy link', exact: true })
          .click();

        return await inviterPage.evaluate(() => navigator.clipboard.readText());
      } finally {
        await inviterPage.close();
      }
    });

  await test.step('Go to invite link', async () => {
    await page.goto(inviteLink);
    await expect(page.getByText(/Join .+ team/)).toBeVisible();
  });

  await test.step('Create new account', async () => {
    await loginPage.clickLoginWithEmailIfVisible();
    await loginPage.typeEmail(email);
    await loginPage.clickContinueButton();
    await loginPage.typePassword(
      process.env.DEFAULT_PASSWORD ?? 'E2e-test-password-2026!',
    );
    await loginPage.clickSignUpButton();
    await expect(page.getByText('Create profile')).toBeVisible();
    await expect(page.getByPlaceholder('Head of Partnerships')).toBeVisible();
    await loginPage.typeFirstName(firstName);
    await loginPage.typeLastName(lastName);
    await loginPage.clickContinueButton();
    await expect(page.getByTestId('workspace-dropdown')).toBeVisible();
  });

  await test.step('Log out and sign back in', async () => {
    await leftMenu.goToSettings();
    await settingsPage.logout();
    await page.waitForURL('**/welcome');

    await loginPage.clickLoginWithEmailIfVisible();
    await loginPage.typeEmail(email);
    await loginPage.clickContinueButton();
    await loginPage.typePassword(
      process.env.DEFAULT_PASSWORD ?? 'E2e-test-password-2026!',
    );
    await loginPage.clickSignInButton();
  });

  await test.step('Delete account from workspace', async () => {
    await expect(page.getByTestId('workspace-dropdown')).toBeVisible();
    await leftMenu.goToSettings();
    await settingsPage.goToProfileSection();
    await profileSection.deleteAccount();
    await expect(page.getByText('Account Deletion')).toBeVisible();
    await confirmationModal.typePlaceholderToInput();
    await confirmationModal.clickConfirmButton();

    await page.waitForURL('**/welcome');
  });
});
