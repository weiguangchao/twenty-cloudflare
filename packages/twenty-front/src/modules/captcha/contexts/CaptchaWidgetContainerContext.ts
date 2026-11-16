import { createContext, type Dispatch, type SetStateAction } from 'react';

export const CaptchaWidgetContainerContext = createContext<
  Dispatch<SetStateAction<HTMLDivElement | null>> | undefined
>(undefined);
