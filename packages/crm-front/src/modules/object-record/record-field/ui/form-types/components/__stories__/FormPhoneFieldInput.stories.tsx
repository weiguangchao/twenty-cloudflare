import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FormPhoneFieldInput } from '@/object-record/record-field/ui/form-types/components/FormPhoneFieldInput';
import { type FieldPhonesValue } from '@/object-record/record-field/ui/types/FieldMetadata';

const meta: Meta<typeof FormPhoneFieldInput> = {
  title: 'UI/Data/Field/Form/Input/FormPhoneFieldInput',
  component: FormPhoneFieldInput,
  args: {},
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof FormPhoneFieldInput>;

const defaultPhoneValue: FieldPhonesValue = {
  primaryPhoneNumber: '0612345678',
  primaryPhoneCountryCode: 'FR',
  primaryPhoneCallingCode: '+33',
};

const FormPhoneFieldInputWithState = ({
  defaultValue,
  label,
  onChange,
  readonly,
  VariablePicker,
}: React.ComponentProps<typeof FormPhoneFieldInput>) => {
  const [value, setValue] = useState<FieldPhonesValue | undefined>(
    defaultValue,
  );

  return (
    <FormPhoneFieldInput
      label={label}
      defaultValue={value}
      onChange={(newValue) => {
        setValue(newValue);
        onChange?.(newValue);
      }}
      readonly={readonly}
      VariablePicker={VariablePicker}
    />
  );
};

export const Default: Story = {
  args: {
    label: 'Phone',
    defaultValue: defaultPhoneValue,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('Phone');
  },
};

export const Disabled: Story = {
  args: {
    label: 'Phone',
    readonly: true,
    VariablePicker: () => <div>VariablePicker</div>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const callingCodeInput = await canvas.findByText('Select a calling code');
    expect(callingCodeInput).toBeVisible();

    await userEvent.click(callingCodeInput);

    const searchInputInModal = canvas.queryByPlaceholderText('Search');
    expect(searchInputInModal).not.toBeInTheDocument();

    const phoneNumberInput = await canvas.findByRole('textbox');
    expect(phoneNumberInput).toHaveAttribute('contenteditable', 'false');

    const variablePickers = canvas.queryAllByText('VariablePicker');
    expect(variablePickers).toHaveLength(0);
  },
};

export const PreservesPhoneFormatting: Story = {
  args: {
    label: 'Phone',
    defaultValue: defaultPhoneValue,
    onChange: fn(),
  },
  render: (args) => <FormPhoneFieldInputWithState {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const phoneInput = await canvas.findByRole('textbox');
    await expect(phoneInput).toHaveTextContent('0612345678');
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '06 12 34 56 78');
    await expect(phoneInput).toHaveTextContent('06 12 34 56 78');
    await expect(args.onChange).toHaveBeenLastCalledWith({
      ...defaultPhoneValue,
      primaryPhoneNumber: '06 12 34 56 78',
    });
  },
};
