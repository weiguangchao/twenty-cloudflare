import { checkIfItsAViteStaleChunkLazyLoadingError } from '@/error-handler/utils/checkIfItsAViteStaleChunkLazyLoadingError';
import { isStaleChunkReloadCooldownActive } from '@/error-handler/utils/isStaleChunkReloadCooldownActive';
import { storeStaleChunkReloadTimestamp } from '@/error-handler/utils/storeStaleChunkReloadTimestamp';
import { type CustomError } from 'twenty-shared/utils';
import { logError } from '~/utils/logError';
import { reloadWindow } from '~/utils/reloadWindow';

export const handleAppError = (error: Error | CustomError) => {
  logError(error);

  const shouldAttemptStaleChunkReload =
    checkIfItsAViteStaleChunkLazyLoadingError(error) &&
    !isStaleChunkReloadCooldownActive();

  if (shouldAttemptStaleChunkReload && storeStaleChunkReloadTimestamp()) {
    reloadWindow();
  }
};
