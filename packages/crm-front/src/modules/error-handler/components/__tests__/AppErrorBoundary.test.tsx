import { render, screen } from '@testing-library/react';

import { AppErrorBoundary } from '@/error-handler/components/AppErrorBoundary';
import { STALE_CHUNK_RELOAD_TIMESTAMP_KEY } from '@/error-handler/constants/StaleChunkReloadTimestampKey';

jest.mock('~/utils/reloadWindow', () => ({
  reloadWindow: jest.fn(),
}));

const { reloadWindow } = jest.requireMock('~/utils/reloadWindow');

const STALE_CHUNK_ERROR_MESSAGE =
  'Failed to fetch dynamically imported module: /assets/Page.js';

type ThrowerProps = {
  error: Error;
};

const Thrower = ({ error }: ThrowerProps): never => {
  throw error;
};

const Fallback = () => <div>fallback content</div>;

const renderWithBoundary = (error: Error) =>
  render(
    <AppErrorBoundary
      FallbackComponent={Fallback}
      resetOnLocationChange={false}
    >
      <Thrower error={error} />
    </AppErrorBoundary>,
  );

describe('AppErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    window.sessionStorage.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should log then reload on a stale chunk error when no reload happened recently', () => {
    const error = new Error(STALE_CHUNK_ERROR_MESSAGE);

    renderWithBoundary(error);

    expect(
      window.sessionStorage.getItem(STALE_CHUNK_RELOAD_TIMESTAMP_KEY),
    ).not.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(reloadWindow).toHaveBeenCalledTimes(1);
  });

  it('should not reload on a stale chunk error within the reload cooldown', () => {
    window.sessionStorage.setItem(
      STALE_CHUNK_RELOAD_TIMESTAMP_KEY,
      Date.now().toString(),
    );

    renderWithBoundary(new Error(STALE_CHUNK_ERROR_MESSAGE));

    expect(screen.getByText('fallback content')).toBeInTheDocument();
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('should not reload on a stale chunk error when the reload timestamp cannot be stored', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sessionStorage access denied');
    });

    renderWithBoundary(new Error(STALE_CHUNK_ERROR_MESSAGE));

    expect(screen.getByText('fallback content')).toBeInTheDocument();
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('should not reload on other errors and still log them', () => {
    const error = new Error('Some unrelated error');

    renderWithBoundary(error);

    expect(screen.getByText('fallback content')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(reloadWindow).not.toHaveBeenCalled();
  });
});
