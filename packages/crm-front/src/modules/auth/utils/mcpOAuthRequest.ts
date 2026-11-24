import { doNotTranslate } from 'crm-shared/i18n';

export const mcpOAuthRequest = async <TData>(
  path: string,
  options: RequestInit = {},
): Promise<TData> => {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'x-crm-session-cookie': '1',
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(doNotTranslate('MCP authorization request failed'));
  }
  return response.json();
};
