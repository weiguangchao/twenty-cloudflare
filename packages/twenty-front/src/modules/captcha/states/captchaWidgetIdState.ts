import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const captchaWidgetIdState = createAtomState<string | undefined>({
  key: 'captchaWidgetIdState',
  defaultValue: undefined,
});
