export type EmailJob = {
  to: string;
  locale: string;
} & (
  | { template: 'password-reset'; link: string; hasPassword: boolean }
  | { template: 'email-verification'; link: string; isEmailUpdate?: boolean }
  | {
      template: 'invitation';
      link: string;
      workspace: { name: string; logo?: string };
      sender: { email: string; firstName: string; lastName: string };
      serverUrl: string;
    }
);
