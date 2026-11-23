import { Logo } from '@/auth/components/Logo';
import { StyledAuthContent } from '@/auth/components/StyledAuthContent';
import { Title } from '@/auth/components/Title';
import { AnimatedEaseIn } from '@/auth/components/internal/AnimatedEaseIn/AnimatedEaseIn';
import { WorkspaceSelectionFooter } from '@/auth/sign-in-up/components/WorkspaceSelectionFooter';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { styled } from '@linaria/react';
import { type JSX } from 'react';
import { AppPath } from 'crm-shared/types';
import { themeCssVariables } from 'crm-ui/theme';
import { type GetPublicWorkspaceDataByDomainQuery } from '~/generated-metadata/graphql';

const StyledTitleContainer = styled.div`
  line-height: 1.2;
  margin-top: ${themeCssVariables.spacing[10]};
`;

const StyledFormContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-bottom: ${themeCssVariables.spacing[6]};
  margin-top: ${themeCssVariables.spacing[6]};
  min-width: 0;
  width: 100%;
`;

type SignInUpStandardContentProps = {
  workspacePublicData:
    | GetPublicWorkspaceDataByDomainQuery['getPublicWorkspaceDataByDomain']
    | null;
  signInUpForm: JSX.Element | null;
  signInUpStep: SignInUpStep;
  title: string;
  onClickOnLogo: () => void;
};

export const SignInUpStandardContent = ({
  workspacePublicData,
  signInUpForm,
  signInUpStep,
  title,
  onClickOnLogo,
}: SignInUpStandardContentProps) => {
  return (
    <StyledAuthContent>
      <AnimatedEaseIn>
        <Logo
          secondaryLogo={workspacePublicData?.logo}
          placeholder={workspacePublicData?.displayName}
          onClick={onClickOnLogo}
          to={AppPath.SignInUp}
        />
      </AnimatedEaseIn>
      <StyledTitleContainer>
        <Title animate>{title}</Title>
      </StyledTitleContainer>
      <StyledFormContainer>{signInUpForm}</StyledFormContainer>
      {signInUpStep === SignInUpStep.WorkspaceSelection && (
        <WorkspaceSelectionFooter />
      )}
    </StyledAuthContent>
  );
};
