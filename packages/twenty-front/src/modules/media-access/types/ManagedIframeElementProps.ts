import { type IframeHTMLAttributes, type ReactNode } from 'react';

export type ManagedIframeElementProps = Pick<
  IframeHTMLAttributes<HTMLIFrameElement>,
  | 'src'
  | 'srcDoc'
  | 'title'
  | 'className'
  | 'style'
  | 'width'
  | 'height'
  | 'hidden'
  | 'onLoad'
  | 'onError'
  | 'sandbox'
  | 'allow'
  | 'allowFullScreen'
> & {
  renderIframe?: (
    options: Pick<IframeHTMLAttributes<HTMLIFrameElement>, 'allow' | 'sandbox'>,
  ) => ReactNode;
  iframeElement?: Element | null;
};
