import { FormDateFieldInput } from '@/object-record/record-field/ui/form-types/components/FormDateFieldInput';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';

const meta: Meta<typeof FormDateFieldInput> = {
  title: 'UI/Data/Field/Form/Input/FormDateFieldInput',
  component: FormDateFieldInput,
  args: {},
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof FormDateFieldInput>;

export const Default: Story = {
  args: {
    label: 'Date',
    defaultValue: undefined,
    onChange: fn(),
  },
};

export const WithDefaultValue: Story = {
  args: {
    label: 'Date',
    defaultValue: '2024-06-15',
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    label: 'Date',
    defaultValue: '2024-06-15',
    readonly: true,
    VariablePicker: () => <div>VariablePicker</div>,
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const input = await waitFor(() => {
      const inputElement = canvasElement.querySelector<HTMLInputElement>(
        'input:not([type="file"])',
      );
      expect(inputElement).not.toBeNull();
      return inputElement!;
    });

    expect(input).toBeDisabled();

    const variablePicker = canvas.queryByText('VariablePicker');
    expect(variablePicker).not.toBeInTheDocument();

    expect(args.onChange).not.toHaveBeenCalled();
  },
};
