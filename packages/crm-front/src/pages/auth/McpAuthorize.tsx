import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { StyledAuthContent } from '@/auth/components/StyledAuthContent';
import { Title } from '@/auth/components/Title';
import { mcpOAuthRequest } from '@/auth/utils/mcpOAuthRequest';
import { MainButton } from 'crm-ui/components/input';
import { themeCssVariables } from 'crm-ui/theme';

const StyledContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  max-width: 480px;
  overflow-wrap: anywhere;
  width: 100%;
`;

const StyledDetails = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  padding: ${themeCssVariables.spacing[4]};
`;

type AuthorizationDetails = {
  clientName: string;
  clientId: string;
  redirectUri: string;
  workspaceName: string;
};

type McpAuthorizeRequestProps = { requestId: string | null };

const McpAuthorizeRequest = ({ requestId }: McpAuthorizeRequestProps) => {
  // English IDs keep consent readable before translation catalogs include these messages.
  const { t } = useLingui();
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    mcpOAuthRequest<AuthorizationDetails>(
      `/oauth/mcp/requests/${encodeURIComponent(requestId ?? '')}`,
      { signal: controller.signal },
    )
      .then(setDetails)
      .catch(() => {
        if (!controller.signal.aborted) {
          setHasError(true);
        }
      });
    return () => controller.abort();
  }, [requestId]);

  const handleDecision = async (approve: boolean) => {
    setIsSubmitting(true);
    try {
      const result = await mcpOAuthRequest<{ redirectUrl: string }>(
        `/oauth/mcp/requests/${encodeURIComponent(requestId ?? '')}`,
        { method: 'POST', body: JSON.stringify({ approve }) },
      );
      window.location.assign(result.redirectUrl);
    } catch {
      setHasError(true);
      setIsSubmitting(false);
    }
  };

  return (
    <StyledAuthContent>
      <StyledContent>
        <Title>
          {t({ id: 'Connect an MCP client', message: 'Connect an MCP client' })}
        </Title>
        {hasError ? (
          <p role="alert">
            {t({
              id: 'This authorization could not be completed. Start a new connection from your client.',
              message:
                'This authorization could not be completed. Start a new connection from your client.',
            })}
          </p>
        ) : !details ? (
          <p role="status">
            {t({
              id: 'Loading authorization…',
              message: 'Loading authorization…',
            })}
          </p>
        ) : (
          <>
            <p>
              {t({
                id: 'This client wants to access your workspace using your account.',
                message:
                  'This client wants to access your workspace using your account.',
              })}
            </p>
            <StyledDetails>
              <p>{details.clientName}</p>
              <p>
                {t({ id: 'Client ID', message: 'Client ID' })}:{' '}
                {details.clientId}
              </p>
              <p>
                {t({ id: 'Workspace', message: 'Workspace' })}:{' '}
                {details.workspaceName}
              </p>
              <p>
                {t({ id: 'Return address', message: 'Return address' })}:{' '}
                {details.redirectUri}
              </p>
            </StyledDetails>
            <p>
              {t({
                id: 'This client can read, create, update, delete, permanently delete, and merge CRM records within your current permissions.',
                message:
                  'This client can read, create, update, delete, permanently delete, and merge CRM records within your current permissions.',
              })}
            </p>
            <p>
              {t({
                id: 'Access continues after you log out. You can revoke it in Settings → Profile → MCP connections.',
                message:
                  'Access continues after you log out. You can revoke it in Settings → Profile → MCP connections.',
              })}
            </p>
            <MainButton
              disabled={isSubmitting}
              onClick={() => void handleDecision(true)}
            >
              {t({ id: 'Authorize', message: 'Authorize' })}
            </MainButton>
            <MainButton
              disabled={isSubmitting}
              variant="outline"
              onClick={() => void handleDecision(false)}
            >
              {t({ id: 'Cancel', message: 'Cancel' })}
            </MainButton>
          </>
        )}
      </StyledContent>
    </StyledAuthContent>
  );
};

export const McpAuthorize = () => {
  const [searchParameters] = useSearchParams();
  const requestId = searchParameters.get('request');
  return <McpAuthorizeRequest key={requestId} requestId={requestId} />;
};
