import { AppBasePath } from 'crm-shared/types';

export const isSettingsPath = (pathname: string) =>
  pathname === AppBasePath.Settings ||
  pathname.startsWith(`${AppBasePath.Settings}/`);
