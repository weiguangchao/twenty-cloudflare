import {
  type ConnectedAccountEmailFields,
  EmailOperation,
} from 'crm-shared/types';
import { canConnectedAccountPerformEmailOperation } from 'crm-shared/utils';

export const filterConnectedAccountsAbleToSendEmail = <
  TConnectedAccount extends ConnectedAccountEmailFields,
>(
  connectedAccounts: TConnectedAccount[],
): TConnectedAccount[] =>
  connectedAccounts.filter((connectedAccount) =>
    canConnectedAccountPerformEmailOperation({
      connectedAccount,
      operation: EmailOperation.SEND,
    }),
  );
