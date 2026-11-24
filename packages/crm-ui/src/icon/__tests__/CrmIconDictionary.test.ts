import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CRM_ICON_DICTIONARY } from '@ui/icon/constants/CrmIconDictionary';
import {
  escapeMarkdownTableCell,
  generateCrmIconDictionaryMarkdown,
} from '@ui/icon/internal/generateCrmIconDictionaryMarkdown';

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));

describe('CrmIconDictionary', () => {
  it('escapes Markdown table delimiters without losing backslashes', () => {
    expect(
      escapeMarkdownTableCell('Backslash \\ and pipe | and\nnewline'),
    ).toBe('Backslash \\\\ and pipe \\| and newline');
  });

  it('has a unique key for every concept', () => {
    const keys = CRM_ICON_DICTIONARY.map((entry) => entry.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('references icons exported by crm-ui/icon', () => {
    const publicIconBarrel = readFileSync(
      resolve(TEST_DIRECTORY, '../index.ts'),
      'utf8',
    );

    for (const entry of CRM_ICON_DICTIONARY) {
      expect(publicIconBarrel).toMatch(new RegExp(`\\b${entry.iconName}\\b`));
    }
  });

  it('references icons available to string-based icon resolution', () => {
    const dynamicIconCatalog = readFileSync(
      resolve(TEST_DIRECTORY, '../provider/internal/AllIcons.ts'),
      'utf8',
    );

    for (const entry of CRM_ICON_DICTIONARY) {
      expect(dynamicIconCatalog).toMatch(new RegExp(`\\b${entry.iconName}\\b`));
    }
  });

  it('provides semantic guidance and search keywords for every concept', () => {
    for (const entry of CRM_ICON_DICTIONARY) {
      expect(entry.useWhen).not.toHaveLength(0);
      expect(entry.avoidWhen).not.toHaveLength(0);
      expect(entry.keywords.length).toBeGreaterThan(0);
    }
  });

  it('keeps the generated Markdown synchronized with the manifest', () => {
    const markdownPath = resolve(TEST_DIRECTORY, '../icon-dictionary.md');

    expect(readFileSync(markdownPath, 'utf8')).toBe(
      generateCrmIconDictionaryMarkdown(),
    );
  });
});
