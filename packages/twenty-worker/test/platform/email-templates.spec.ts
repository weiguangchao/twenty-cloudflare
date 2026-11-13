import { createElement } from 'react';
import { expect, it } from 'vitest';
import {
  PasswordResetLinkEmail,
  SendEmailVerificationLinkEmail,
  SendInviteLinkEmail,
  renderEmail,
  toPlainText,
} from 'twenty-emails';

it('renders the existing transactional templates in workerd', async () => {
  const link = 'https://crm.example.com/verify-email?token=test';
  for (const template of [
    createElement(PasswordResetLinkEmail, {
      link,
      duration: '1 hour',
      hasPassword: true,
      locale: 'en',
    }),
    createElement(SendEmailVerificationLinkEmail, { link, locale: 'en' }),
    createElement(SendInviteLinkEmail, {
      link,
      locale: 'en',
      workspace: { name: 'Example', logo: undefined },
      sender: { email: 'admin@example.com', firstName: 'Admin', lastName: '' },
      serverUrl: 'https://crm.example.com',
    }),
  ]) {
    const html = await renderEmail(template);
    expect(html).toContain(link.replaceAll('&', '&amp;'));
    expect(toPlainText(html)).toContain(link);
  }
});
