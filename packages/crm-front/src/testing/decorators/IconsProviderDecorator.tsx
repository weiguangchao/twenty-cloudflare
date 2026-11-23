import { type Decorator } from '@storybook/react-vite';
import { IconsProvider } from 'crm-ui/icon/provider';

export const IconsProviderDecorator: Decorator = (Story) => {
  return (
    <IconsProvider>
      <Story />
    </IconsProvider>
  );
};
