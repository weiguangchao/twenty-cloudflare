import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { getUserDevice } from 'crm-ui/utilities';

const meta: Meta<typeof FormTextFieldInput> = {
  title: 'UI/Data/Field/Form/Input/FormTextFieldInput',
  component: FormTextFieldInput,
  args: {},
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof FormTextFieldInput>;

export const Default: Story = {
  args: {
    placeholder: 'Text field...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Text',
    placeholder: 'Text field...',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/^Text$/);

    expect(await canvas.findByRole('textbox', { name: 'Text' })).toBeVisible();
  },
};

export const WithError: Story = {
  args: {
    label: 'Variable Name',
    placeholder: 'Text field...',
    defaultValue: 'invalid name',
    error:
      'Use only letters, numbers, underscores, dots or hyphens (max 64 characters).',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const error = await canvas.findByText(
      'Use only letters, numbers, underscores, dots or hyphens (max 64 characters).',
    );

    expect(error).toBeVisible();
  },
};

export const Multiline: Story = {
  args: {
    label: 'Text',
    placeholder: 'Text field...',
    multiline: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/^Text$/);
  },
};

export const MultilineWithDefaultValue: Story = {
  args: {
    label: 'Text',
    defaultValue: 'Line 1\nLine 2\n\nLine 4',
    placeholder: 'Text field...',
    multiline: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText(/^Text$/);

    const editor = canvasElement.querySelector('.ProseMirror > p');

    expect((editor as HTMLElement).innerText).toBe('Line 1\nLine 2\n\nLine 4');
  },
};

export const Disabled: Story = {
  args: {
    label: 'Text',
    placeholder: 'Text field...',
    defaultValue: 'Text field',
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

    const defaultValue = await canvas.findByText('Text field');
    expect(defaultValue).toBeVisible();

    await userEvent.type(editor, 'Hello');

    expect(args.onChange).not.toHaveBeenCalled();
    expect(canvas.queryByText('Hello')).not.toBeInTheDocument();
    expect(defaultValue).toBeVisible();
  },
};

export const WithTemplateVariableFallback: Story = {
  args: {
    label: 'Subject',
    defaultValue: 'Hi {{jobTitle | default: "there"}}',
    enableTemplateVariableFallback: true,
    onChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    expect(await canvas.findByText('{{jobTitle}}')).toBeVisible();

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Edit fallback value' }),
    );

    expect(
      await body.findByRole('textbox', { name: 'Fallback value' }),
    ).toHaveValue('there');
  },
};

export const WithMissingTemplateVariableFallback: Story = {
  args: {
    label: 'Subject',
    defaultValue: 'Hi {{jobTitle}}',
    enableTemplateVariableFallback: true,
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Edit fallback value' }),
    );

    await userEvent.type(
      await body.findByRole('textbox', { name: 'Fallback value' }),
      'there{Enter}',
    );

    await waitFor(() => {
      expect(args.onChange).toHaveBeenLastCalledWith(
        'Hi {{jobTitle | default: "there"}}',
      );
    });
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

    expect(args.onChange).toHaveBeenLastCalledWith('Hello World');

    await userEvent.type(editor, `{${controlKey}>}z{/${controlKey}}`);

    expect(editor).toHaveTextContent('');
    expect(args.onChange).toHaveBeenLastCalledWith('');

    await userEvent.type(
      editor,
      `{Shift>}{${controlKey}>}z{/${controlKey}}{/Shift}`,
    );

    expect(editor).toHaveTextContent('Hello World');
    expect(args.onChange).toHaveBeenLastCalledWith('Hello World');
  },
};
