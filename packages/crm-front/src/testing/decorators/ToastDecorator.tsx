import { type Decorator } from '@storybook/react-vite';
import { ToastProvider } from 'crm-ui/components/feedback';

export const ToastDecorator: Decorator = (Story) => (
  <ToastProvider>
    <Story />
  </ToastProvider>
);
