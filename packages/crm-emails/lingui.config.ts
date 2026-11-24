import { defineConfig } from '@lingui/conf';
import { formatter } from '@lingui/format-po';
import { APP_LOCALES, SOURCE_LOCALE } from 'crm-shared/translations';

export default defineConfig({
  sourceLocale: 'en',
  locales: Object.values(APP_LOCALES),
  pseudoLocale: 'pseudo-en',
  fallbackLocales: {
    default: SOURCE_LOCALE,
  },
  extractorParserOptions: {
    tsExperimentalDecorators: true,
  },
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['src'],
    },
  ],
  catalogsMergePath: '<rootDir>/src/locales/generated/{locale}',
  // With explicit ids the default order is non-deterministic, so `lingui
  // extract` would reorder the .po on every run.
  orderBy: 'messageId',
  compileNamespace: 'ts',
  format: formatter({ lineNumbers: false, printLinguiId: true }),
});
