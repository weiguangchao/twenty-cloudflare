import { CaptchaDriverType } from '~/generated-metadata/graphql';

import { getCaptchaUrlByProvider } from '@/captcha/utils/getCaptchaUrlByProvider';

describe('getCaptchaUrlByProvider', () => {
  it('handles GoogleRecaptcha', async () => {
    const captchaUrl = getCaptchaUrlByProvider(
      CaptchaDriverType.GOOGLE_RECAPTCHA,
      'siteKey',
    );

    expect(captchaUrl).toEqual(
      'https://www.google.com/recaptcha/api.js?render=siteKey',
    );

    expect(() =>
      getCaptchaUrlByProvider(CaptchaDriverType.GOOGLE_RECAPTCHA, ''),
    ).toThrow(
      'SiteKey must be provided while generating url for GoogleRecaptcha provider',
    );
  });

  it('handles unknown provider', async () => {
    expect(() =>
      getCaptchaUrlByProvider('Unknown' as CaptchaDriverType, ''),
    ).toThrow('Unknown captcha provider');
  });
});
