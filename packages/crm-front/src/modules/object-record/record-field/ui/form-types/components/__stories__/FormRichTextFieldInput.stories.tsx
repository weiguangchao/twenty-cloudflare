import { FormRichTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormRichTextFieldInput';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type JSONContent } from '@tiptap/core';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { TIPTAP_DOCUMENT_SCHEMA_VERSION } from 'crm-shared/utils';
import { getUserDevice } from 'crm-ui/utilities';

const serializeDocument = (content: JSONContent[]) =>
  JSON.stringify({
    type: 'doc',
    content,
    attrs: { schemaVersion: TIPTAP_DOCUMENT_SCHEMA_VERSION },
  });

const meta: Meta<typeof FormRichTextFieldInput> = {
  title: 'UI/Data/Field/Form/Input/FormRichTextFieldInput',
  component: FormRichTextFieldInput,
  args: {},
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof FormRichTextFieldInput>;

export const Default: Story = {
  args: {
    placeholder: 'Rich Text field...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Rich Text',
    placeholder: 'Rich Text field...',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('Rich Text');
  },
};

export const Disabled: Story = {
  args: {
    label: 'Text',
    placeholder: 'Text field...',
    defaultValue: {
      tiptap: null,
      markdown: 'Rich Text',
    },
    readonly: true,
    VariablePicker: () => <div>VariablePicker</div>,
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const editor = await waitFor(() => {
      const editor = canvasElement.querySelector('.ProseMirror > p');
      expect(editor).toBeVisible();
      return editor;
    });

    if (!editor) {
      throw new Error('Editor element not found');
    }

    const variablePicker = canvas.queryByText('VariablePicker');
    expect(variablePicker).not.toBeInTheDocument();

    const defaultValue = await canvas.findByText('Rich Text');
    expect(defaultValue).toBeVisible();

    await userEvent.type(editor, 'Hello');

    expect(args.onChange).not.toHaveBeenCalled();
    expect(canvas.queryByText('Hello')).not.toBeInTheDocument();
    expect(defaultValue).toBeVisible();
  },
};

export const HasHistory: Story = {
  args: {
    label: 'Text',
    placeholder: 'Text field...',
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const controlKey = getUserDevice() === 'mac' ? 'Meta' : 'Control';

    const editor = await waitFor(() => {
      const editor = canvasElement.querySelector('.ProseMirror > p');
      expect(editor).toBeVisible();
      return editor;
    });

    if (!editor) {
      throw new Error('Editor element not found');
    }

    await userEvent.type(editor, 'Hello World');

    const documentWithText = serializeDocument([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello World' }],
      },
    ]);

    expect(args.onChange).toHaveBeenLastCalledWith({
      tiptap: documentWithText,
      markdown: null,
      blocknote: null,
    });

    await userEvent.type(editor, `{${controlKey}>}z{/${controlKey}}`);

    expect(editor).toHaveTextContent('');
    expect(args.onChange).toHaveBeenLastCalledWith({
      tiptap: serializeDocument([{ type: 'paragraph' }]),
      markdown: null,
      blocknote: null,
    });

    await userEvent.type(
      editor,
      `{Shift>}{${controlKey}>}z{/${controlKey}}{/Shift}`,
    );

    expect(editor).toHaveTextContent('Hello World');
    expect(args.onChange).toHaveBeenLastCalledWith({
      tiptap: documentWithText,
      markdown: null,
      blocknote: null,
    });
  },
};
