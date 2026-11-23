import { RuleTester } from 'oxlint/plugins-dev';

import { rule, RULE_NAME } from './enforce-module-boundaries';

const depConstraints = [
  {
    sourceTag: 'scope:frontend',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:frontend'],
  },
  {
    sourceTag: 'scope:backend',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:backend'],
  },
  {
    sourceTag: 'scope:shared',
    onlyDependOnLibsWithTags: ['scope:shared'],
  },
];

const ruleTester = new RuleTester();

ruleTester.run(RULE_NAME, rule, {
  valid: [
    {
      code: "import { isDefined } from 'crm-shared';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-front/src/utils.ts',
    },
    {
      code: "import { Button } from 'crm-ui';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-front/src/components.tsx',
    },
    {
      code: "import { isDefined } from 'crm-shared';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-worker/src/utils.ts',
    },
    {
      code: "import { helper } from './local';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-front/src/utils.ts',
    },
    {
      code: "import lodash from 'lodash';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-front/src/utils.ts',
    },
    {
      code: "import { isDefined } from 'crm-shared';",
      options: [{ depConstraints: [] }],
      filename: '/project/packages/crm-front/src/utils.ts',
    },
  ],
  invalid: [
    {
      code: "import { WorkerService } from 'crm-worker';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-front/src/bad-import.ts',
      errors: [{ messageId: 'moduleBoundaryViolation' }],
    },
    {
      code: "import { Component } from 'crm-front';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-worker/src/bad-import.ts',
      errors: [{ messageId: 'moduleBoundaryViolation' }],
    },
    {
      code: "import { Component } from 'crm-front';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-shared/src/bad-import.ts',
      errors: [{ messageId: 'moduleBoundaryViolation' }],
    },
    {
      code: "import { WorkerThing } from 'crm-worker';",
      options: [{ depConstraints }],
      filename: '/project/packages/crm-shared/src/bad-import.ts',
      errors: [{ messageId: 'moduleBoundaryViolation' }],
    },
  ],
});
