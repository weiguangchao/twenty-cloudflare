import { type AdvancedTextEditorProfile } from '@/advanced-text-editor/types/AdvancedTextEditorProfile';
import { buildFullRichTextExtensions } from '@/advanced-text-editor/utils/buildFullRichTextExtensions';
import { parseLegacyMarkdownDocument } from '@/advanced-text-editor/utils/parseLegacyMarkdownDocument';

export const RECORD_RICH_TEXT_EDITOR_PROFILE = {
  chrome: 'field',
  variant: 'app',
  minHeight: 340,
  enableFullScreen: true,
  parseLegacyDocument: parseLegacyMarkdownDocument,
  buildExtensions: buildFullRichTextExtensions,
} satisfies AdvancedTextEditorProfile;
