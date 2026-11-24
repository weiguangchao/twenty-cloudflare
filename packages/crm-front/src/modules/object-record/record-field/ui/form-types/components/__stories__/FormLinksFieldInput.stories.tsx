import { FormLinksFieldInput } from '@/object-record/record-field/ui/form-types/components/FormLinksFieldInput';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

const meta: Meta<typeof FormLinksFieldInput> = {
  title: 'UI/Data/Field/Form/Input/FormLinksFieldInput',
  component: FormLinksFieldInput,
  args: {},
  argTypes: {},
  decorators: [],
};

export default meta;

type Story = StoryObj<typeof FormLinksFieldInput>;

export const Default: Story = {
  args: {
    label: 'Domain Name',
    defaultValue: {
      primaryLinkLabel: 'Google',
      primaryLinkUrl: 'https://www.google.com',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('Domain Name');
    await canvas.findByText('Primary Link Label');
    await canvas.findByText('Google');
  },
};

export const PreservesSecondaryLinksWhenEditingPrimary: Story = {
  args: {
    label: 'Intro Video',
    onChange: fn(),
    defaultValue: {
      primaryLinkLabel: 'Google',
      primaryLinkUrl: 'https://www.google.com',
      secondaryLinks: [
        { label: 'Documentation', url: 'https://docs.example.com' },
      ],
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const labelInput = await canvas.findByText('Google');

    await userEvent.type(labelInput, 'X');

    await waitFor(() => {
      expect(args.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryLinks: [
            { label: 'Documentation', url: 'https://docs.example.com' },
          ],
        }),
      );
    });
  },
};

export const AddsASecondaryLink: Story = {
  args: {
    label: 'Intro Video',
    onChange: fn(),
    defaultValue: {
      primaryLinkLabel: 'Google',
      primaryLinkUrl: 'https://www.google.com',
      secondaryLinks: [],
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const secondaryLinkInput =
      await canvas.findByPlaceholderText('Enter an item');

    await userEvent.type(secondaryLinkInput, 'https://docs.example.com{enter}');

    await waitFor(() => {
      expect(args.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          secondaryLinks: [{ label: null, url: 'https://docs.example.com' }],
        }),
      );
    });
  },
};

export const StopsAddingSecondaryLinksAtTheFieldLimit: Story = {
  args: {
    label: 'Intro Video',
    onChange: fn(),
    maxNumberOfValues: 2,
    defaultValue: {
      primaryLinkLabel: 'Google',
      primaryLinkUrl: 'https://www.google.com',
      secondaryLinks: [{ label: null, url: 'https://docs.example.com' }],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByText('https://docs.example.com'));

    await waitFor(() => {
      expect(canvas.queryByText('Add item')).not.toBeInTheDocument();
    });
  },
};

export const HidesSecondaryLinksWhenSingleValueField: Story = {
  args: {
    label: 'Domain Name',
    maxNumberOfValues: 1,
    defaultValue: {
      primaryLinkLabel: 'Google',
      primaryLinkUrl: 'https://www.google.com',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('Primary Link Label');

    expect(canvas.queryByText('Secondary Links')).not.toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    label: 'Domain Name',
    readonly: true,
    onChange: fn(),
    VariablePicker: () => <div>VariablePicker</div>,
    defaultValue: {
      primaryLinkLabel: 'Google',
      primaryLinkUrl: 'https://www.google.com',
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const labelInput = await canvas.findByText('Google');
    const linkInput = await canvas.findByText('https://www.google.com');

    await userEvent.type(labelInput, 'Yahoo');
    await userEvent.type(linkInput, 'https://www.yahoo.com');

    expect(args.onChange).not.toHaveBeenCalled();

    const variablePickers = canvas.queryAllByText('VariablePicker');
    expect(variablePickers).toHaveLength(0);
  },
};
