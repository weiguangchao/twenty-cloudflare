import { GraphQLError } from 'graphql';

export const apiError = (
  message: string,
  code = 'BAD_USER_INPUT',
  subCode?: string,
) =>
  new GraphQLError(message, {
    extensions: {
      code,
      ...(subCode ? { subCode } : {}),
      userFriendlyMessage: message,
    },
  });

export const unauthenticated = (message = 'Missing authentication token') =>
  apiError(message, 'UNAUTHENTICATED', 'UNAUTHENTICATED');
