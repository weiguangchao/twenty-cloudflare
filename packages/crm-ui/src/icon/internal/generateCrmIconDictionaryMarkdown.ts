import {
  CRM_ICON_DICTIONARY,
  CRM_ICON_DICTIONARY_CATEGORIES,
  CRM_ICON_DICTIONARY_FIGMA_URL,
  type CrmIconDictionaryEntry,
} from '../constants/CrmIconDictionary';

export const escapeMarkdownTableCell = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const getEntryTableRow = (entry: CrmIconDictionaryEntry) =>
  `| ${escapeMarkdownTableCell(entry.label)} | \`${entry.iconName}\` | \`${entry.tablerName}\` | ${escapeMarkdownTableCell(entry.useWhen)} | ${escapeMarkdownTableCell(entry.avoidWhen)} | ${entry.keywords.map(escapeMarkdownTableCell).join(', ')} |`;

export const generateCrmIconDictionaryMarkdown = () => {
  const categorySections = CRM_ICON_DICTIONARY_CATEGORIES.map((category) => {
    const entries = CRM_ICON_DICTIONARY.filter(
      (entry) => entry.category === category.key,
    );

    return [
      `## ${category.label}`,
      '',
      '| Concept | React component | Tabler name | Use when | Avoid when | Search keywords |',
      '| --- | --- | --- | --- | --- | --- |',
      ...entries.map(getEntryTableRow),
    ].join('\n');
  }).join('\n\n');

  return `# CRM Icon Dictionary

<!-- This file is generated. Edit constants/CrmIconDictionary.ts, then run: npx nx generateIconDictionary crm-ui -->

This is the canonical engineering reference for icons that represent CRM product concepts. The [Figma dictionary](${CRM_ICON_DICTIONARY_FIGMA_URL}) is the visual reference; the typed manifest in [\`constants/CrmIconDictionary.ts\`](./constants/CrmIconDictionary.ts) is the code source of truth.

## Selection rules

1. When a UI element represents one of the concepts below, use its canonical icon.
2. Use action icons such as \`IconPlus\`, \`IconEdit\`, or \`IconTrash\` when the element represents an action rather than a product concept.
3. Use status icons for statuses and feedback. Do not replace them with a nearby dictionary concept.
4. Import icons from \`crm-ui/icon\`. Do not import directly from \`@tabler/icons-react\`.
5. If no concept matches, choose an existing icon from \`crm-ui/icon\` and do not add a new icon package.

## Usage

\`\`\`tsx
import { IconHierarchy } from 'crm-ui/icon';
\`\`\`

${categorySections}

## Updating the dictionary

1. Update the typed manifest in \`constants/CrmIconDictionary.ts\`.
2. Confirm the visual choice in the linked Figma dictionary.
3. Run \`npx nx generateIconDictionary crm-ui\`.
4. Review the \`UI/Icon/Icon Dictionary\` Storybook story.
5. Run \`npx vitest run --root packages/crm-ui --project unit src/icon/__tests__/CrmIconDictionary.test.ts\`.
`;
};
