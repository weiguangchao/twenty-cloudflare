import { createElement } from 'react';
import { APP_LOCALES } from 'crm-shared/translations';

import { type EmailJob } from '@/emails/types/email-job.type';

export const renderTransactionalEmail = async (job: EmailJob) => {
  // The prebuilt email bundle evaluates UUID defaults and must load inside a handler.
  const {
    PasswordResetLinkEmail,
    SendEmailVerificationLinkEmail,
    SendInviteLinkEmail,
    renderEmail,
    toPlainText,
  } = await import('crm-emails');
  const locale = Object.hasOwn(APP_LOCALES, job.locale)
    ? (job.locale as keyof typeof APP_LOCALES)
    : 'en';
  const template =
    job.template === 'password-reset'
      ? createElement(PasswordResetLinkEmail, {
          ...job,
          locale,
          duration: new Intl.NumberFormat(
            locale === 'pseudo-en' ? 'en' : locale,
            { style: 'unit', unit: 'hour', unitDisplay: 'long' },
          ).format(1),
        })
      : job.template === 'email-verification'
        ? createElement(SendEmailVerificationLinkEmail, { ...job, locale })
        : createElement(SendInviteLinkEmail, {
            ...job,
            locale,
            workspace: { ...job.workspace, logo: job.workspace.logo },
          });
  const html = await renderEmail(template);
  const heading = /<h1\b[^>]*>(.*?)<\/h1>/s.exec(html)?.[1];
  if (!heading)
    throw new Error('Email template is missing its translated heading');
  return {
    subject: toPlainText(heading).replace(/\s+/g, ' ').trim(),
    html,
    text: toPlainText(html),
  };
};
