type LogEvent = {
  event: string;
  requestId?: string;
  workspaceId?: string;
  durableObjectId?: string;
  operation?: string;
  durationMs?: number;
  status?: number;
  databaseSize?: number;
  capacityRatio?: number;
  errorCode?: string;
};

export const logEvent = (event: LogEvent, level: 'info' | 'error' = 'info') => {
  const message = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  });
  if (level === 'error') console.error(message);
  else console.log(message);
};

export const logOperationName = (name?: string | null) =>
  name && /^[A-Za-z_][A-Za-z_0-9]{0,79}$/.test(name) ? name : 'anonymous';
