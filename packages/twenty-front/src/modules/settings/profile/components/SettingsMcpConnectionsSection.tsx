import { useEffect, useState } from 'react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { mcpOAuthRequest } from '@/auth/utils/mcpOAuthRequest';
import { Button } from 'twenty-ui/primitives/input';
import { Section } from 'twenty-ui/components/layout';
import { themeCssVariables } from 'twenty-ui/theme';

type McpConnection = { id: string; clientName: string; clientId: string };

const StyledConnection = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]} 0;
`;

const StyledLabel = styled.div`
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const SettingsMcpConnectionsSection = () => {
  const { t } = useLingui();
  const [connections, setConnections] = useState<McpConnection[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    mcpOAuthRequest<{ connections: McpConnection[] }>(
      '/oauth/mcp/connections',
      { signal: controller.signal },
    )
      .then((result) => setConnections(result.connections))
      .catch(() => {
        if (!controller.signal.aborted) {
          setHasError(true);
        }
      });
    return () => controller.abort();
  }, []);

  const handleRevoke = async (connectionId: string) => {
    setRevokingId(connectionId);
    setHasError(false);
    try {
      await mcpOAuthRequest(`/oauth/mcp/connections/${connectionId}`, {
        method: 'DELETE',
      });
      setConnections(
        (current) =>
          current?.filter((connection) => connection.id !== connectionId) ?? [],
      );
    } catch {
      setHasError(true);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Section.Root>
      <Section.Header
        title={t({ id: 'MCP connections', message: 'MCP connections' })}
        description={t({
          id: 'Clients authorized to access this workspace using your account',
          message:
            'Clients authorized to access this workspace using your account',
        })}
      />
      {hasError && (
        <p role="alert">
          {t({
            id: 'Unable to update MCP connections. Please try again.',
            message: 'Unable to update MCP connections. Please try again.',
          })}
        </p>
      )}
      {!connections && !hasError && (
        <p role="status">
          {t({ id: 'Loading connections…', message: 'Loading connections…' })}
        </p>
      )}
      {connections?.length === 0 && (
        <p>
          {t({ id: 'No connected clients', message: 'No connected clients' })}
        </p>
      )}
      {connections?.map((connection) => (
        <StyledConnection key={connection.id}>
          <StyledLabel>
            <div>{connection.clientName}</div>
            <small>{connection.clientId}</small>
          </StyledLabel>
          <Button
            size="sm"
            disabled={revokingId !== null}
            aria-label={`${t({ id: 'Revoke', message: 'Revoke' })} ${connection.clientName}`}
            onClick={() => void handleRevoke(connection.id)}
          >
            {t({ id: 'Revoke', message: 'Revoke' })}
          </Button>
        </StyledConnection>
      ))}
    </Section.Root>
  );
};
