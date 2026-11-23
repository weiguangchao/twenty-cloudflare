import { expect, test } from '@playwright/test';
import { postBackendGraphQL } from '../lib/requests/post-backend-graphql';

test('Create a person and update a standard field', async ({ page }) => {
  await page.goto('/objects/people');
  await page.getByRole('button', { name: 'Create Person' }).click();
  await page
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('John Doe');
  const email = `person-${Date.now()}@example.test`;
  await page.getByRole('textbox', { name: 'Emails', exact: true }).fill(email);
  await page.getByTestId('record-creation-form-create-button').click();
  const fields = page.getByTestId('record-fields-widget');
  await expect(fields.getByText(email)).toBeVisible();
  await fields.getByText('Job Title', { exact: true }).nth(1).dblclick();
  const jobTitle = page.getByRole('textbox', {
    name: 'Job Title',
    exact: true,
  });
  await jobTitle.fill('Engineer');
  await jobTitle.press('Enter');
  await page.getByRole('button', { name: 'Expand record' }).click();
  await page.waitForURL(/\/object\/person\//);
  const id = new URL(page.url()).pathname.split('/').at(-1);
  const result = await postBackendGraphQL<{
    person: {
      jobTitle: string;
      emails: { primaryEmail: string };
      name: { firstName: string; lastName: string };
    };
  }>({
    page,
    data: {
      query:
        'query Person($id: UUID!) { person(filter: { id: { eq: $id } }) { name { firstName lastName } emails { primaryEmail } jobTitle } }',
      variables: { id },
    },
  });
  expect(result.body.errors).toBeUndefined();
  expect(result.body.data?.person).toMatchObject({
    name: { firstName: 'John', lastName: 'Doe' },
    emails: { primaryEmail: email },
    jobTitle: 'Engineer',
  });
  await page.reload();
  await expect(fields.getByText('Engineer', { exact: true })).toBeVisible();
});
