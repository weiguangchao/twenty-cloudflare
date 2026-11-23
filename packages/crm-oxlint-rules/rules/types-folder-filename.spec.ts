import { RuleTester } from 'oxlint/plugins-dev';

import { rule, RULE_NAME } from './types-folder-filename';

const ruleTester = new RuleTester();

const DUMMY_CODE = 'const x = 1;';

const PASCAL_CASE = [{ convention: 'PascalCase' }];
const KEBAB_CASE_TYPE_SUFFIX = [{ convention: 'kebab-case-type-suffix' }];

const front = (path: string) => `/project/packages/crm-front/src/${path}`;
const worker = (path: string) => `/project/packages/crm-worker/src/${path}`;

ruleTester.run(RULE_NAME, rule, {
  valid: [
    {
      code: DUMMY_CODE,
      filename: front('modules/object-metadata/types/MetadataRequestResult.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/types/AgentChatFileUIPart.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/settings/types/SettingsPanel.tsx'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/types/global.d.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/auth/types/AuthenticatedMethod.enum.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/apollo/types/apolloManager.interface.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/types/index.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/types/__tests__/toolWidget.spec.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/hooks/useAiChatFileUpload.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/types/page-layout/chart-filter.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: worker('modules/workflow/types/workflow-action-input.type.ts'),
      options: KEBAB_CASE_TYPE_SUFFIX,
    },
    {
      code: DUMMY_CODE,
      filename: worker('engine/api/rest/types/request-context.type.ts'),
      options: KEBAB_CASE_TYPE_SUFFIX,
    },
    {
      code: DUMMY_CODE,
      filename: worker('engine/core-modules/ai/types/model-family.enum.ts'),
      options: KEBAB_CASE_TYPE_SUFFIX,
    },
    {
      code: DUMMY_CODE,
      filename: worker(
        'engine/metadata-modules/types/syncable-entity.interface.ts',
      ),
      options: KEBAB_CASE_TYPE_SUFFIX,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/geo-map/types/placeApi.custom.ts'),
      options: [{ convention: 'PascalCase', allowedSuffixes: ['custom'] }],
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/types/toolWidget.spec.ts'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/types/toolWidget.test.tsx'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/types/toolWidget.stories.tsx'),
      options: PASCAL_CASE,
    },
    {
      code: DUMMY_CODE,
      filename: worker('modules/workflow/types/workflow-action-input.spec.ts'),
      options: KEBAB_CASE_TYPE_SUFFIX,
    },
  ],
  invalid: [
    {
      code: DUMMY_CODE,
      filename: front('modules/ai/types/tool-widget.type.ts'),
      options: PASCAL_CASE,
      errors: [{ messageId: 'invalidPascalCaseFilename' }],
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/applications/types/applicationDisplayData.ts'),
      options: PASCAL_CASE,
      errors: [{ messageId: 'invalidPascalCaseFilename' }],
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/page-layout/types/page-layout-dragged-area.ts'),
      options: PASCAL_CASE,
      errors: [{ messageId: 'invalidPascalCaseFilename' }],
    },
    {
      code: DUMMY_CODE,
      filename: worker('engine/api/rest/types/RequestContext.ts'),
      options: KEBAB_CASE_TYPE_SUFFIX,
      errors: [{ messageId: 'invalidKebabCaseTypeFilename' }],
    },
    {
      code: DUMMY_CODE,
      filename: worker('modules/messaging/types/message.ts'),
      options: KEBAB_CASE_TYPE_SUFFIX,
      errors: [{ messageId: 'invalidKebabCaseTypeFilename' }],
    },
    {
      code: DUMMY_CODE,
      filename: worker('engine/core-modules/dpa/types/dpa.types.ts'),
      options: KEBAB_CASE_TYPE_SUFFIX,
      errors: [{ messageId: 'invalidKebabCaseTypeFilename' }],
    },
    {
      code: DUMMY_CODE,
      filename: worker(
        'engine/metadata-modules/ai/types/modelConfiguration.ts',
      ),
      options: KEBAB_CASE_TYPE_SUFFIX,
      errors: [{ messageId: 'invalidKebabCaseTypeFilename' }],
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/geo-map/types/placeApi.custom.ts'),
      options: PASCAL_CASE,
      errors: [{ messageId: 'invalidPascalCaseFilename' }],
    },
    {
      code: DUMMY_CODE,
      filename: front('modules/geo-map/types/placeApiXbar.ts'),
      options: [{ convention: 'PascalCase', allowedSuffixes: ['foo.bar'] }],
      errors: [{ messageId: 'invalidPascalCaseFilename' }],
    },
  ],
});
