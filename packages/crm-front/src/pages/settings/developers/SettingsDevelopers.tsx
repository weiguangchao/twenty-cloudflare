import { NavigationButton } from '@/ui/input/components/NavigationButton';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { SettingsTabBar } from '@/settings/components/layout/SettingsTabBar';
import { useSettingsActiveTabId } from '@/settings/components/layout/useSettingsActiveTabId';
import { SettingsDiscoveryHeroCard } from '@/settings/components/SettingsDiscoveryHeroCard';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import PlaygroundCoverDark from '@/settings/developers/assets/cover-dark.png';
import PlaygroundCoverLight from '@/settings/developers/assets/cover-light.png';
import { PlaygroundSetupForm } from '@/settings/developers/components/PlaygroundSetupForm';
import { SettingsApiKeysTable } from '@/settings/developers/components/SettingsApiKeysTable';
import { SettingsWebhooksTable } from '@/settings/developers/components/SettingsWebhooksTable';
import { SETTINGS_DEVELOPERS_TABS } from '@/settings/developers/constants/SettingsDevelopersTabs';
import { TableFooter } from '@/ui/layout/table/components/TableFooter';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'crm-shared/types';
import { getSettingsPath } from 'crm-shared/utils';
import { Section } from 'crm-ui/components/layout';
import { IconApi, IconPlus, IconSparkle2, IconWebhook } from 'crm-ui/icon';
import { themeCssVariables } from 'crm-ui/theme';
import { useIsMobile } from 'crm-ui/utilities';

type TabKey =
  (typeof SETTINGS_DEVELOPERS_TABS.TABS_IDS)[keyof typeof SETTINGS_DEVELOPERS_TABS.TABS_IDS];

const SETTINGS_DEVELOPERS_HERO_INSTANCE_ID_PREFIX = 'settings-developers-hero';

const StyledTabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[10]};
  padding-top: ${themeCssVariables.spacing[6]};
`;

const StyledTableContainer = styled.div<{ isMobile?: boolean }>`
  display: flex;
  flex-direction: column;
  overflow: ${({ isMobile }) => (isMobile ? 'hidden' : 'visible')};
`;

export const SettingsDevelopers = () => {
  const isMobile = useIsMobile();
  const { t } = useLingui();

  const tabs = [
    {
      id: SETTINGS_DEVELOPERS_TABS.TABS_IDS.API,
      title: t`API`,
      Icon: IconApi,
    },
    {
      id: SETTINGS_DEVELOPERS_TABS.TABS_IDS.WEBHOOKS,
      title: t`Webhooks`,
      Icon: IconWebhook,
    },
  ];

  const activeTab: TabKey =
    (useSettingsActiveTabId(
      SETTINGS_DEVELOPERS_TABS.COMPONENT_INSTANCE_ID,
      tabs.map((tab) => tab.id),
    ) as TabKey) ?? SETTINGS_DEVELOPERS_TABS.TABS_IDS.API;

  return (
    <SettingsPageLayout
      title={t`Developers`}
      secondaryBar={
        <SettingsTabBar
          aria-label={t`Developers`}
          tabs={tabs}
          componentInstanceId={SETTINGS_DEVELOPERS_TABS.COMPONENT_INSTANCE_ID}
        />
      }
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        { children: t`Developers` },
      ]}
    >
      <SettingsPageContainer>
        <Section.Root>
          <SettingsDiscoveryHeroCard
            lightSrc={PlaygroundCoverLight}
            darkSrc={PlaygroundCoverDark}
            instanceIdPrefix={SETTINGS_DEVELOPERS_HERO_INSTANCE_ID_PREFIX}
            tabs={[
              {
                id: 'api_webhook_walkthrough',
                title: t`Walkthrough`,
                Icon: IconSparkle2,
                vimeoId: '1217967646',
                hasSound: true,
              },
            ]}
            playButtonAriaLabel={t`Watch API demo`}
          />
        </Section.Root>

        {activeTab === SETTINGS_DEVELOPERS_TABS.TABS_IDS.API && (
          <StyledTabContent>
            <Section.Root>
              <Section.Header
                title={t`Documentation`}
                description={t`Try our REST or GraphQL API playgrounds`}
              />
              <PlaygroundSetupForm />
            </Section.Root>

            <Section.Root>
              <Section.Header
                title={t`API Keys`}
                description={t`Active API keys created by you or your team.`}
              />
              <StyledTableContainer isMobile={isMobile}>
                <SettingsApiKeysTable />
                <TableFooter>
                  <NavigationButton
                    startIcon={<IconPlus />}
                    size="sm"
                    to={getSettingsPath(SettingsPath.NewApiKey)}
                    variant="outline"
                  >{t`Create API key`}</NavigationButton>
                </TableFooter>
              </StyledTableContainer>
            </Section.Root>
          </StyledTabContent>
        )}

        {activeTab === SETTINGS_DEVELOPERS_TABS.TABS_IDS.WEBHOOKS && (
          <StyledTabContent>
            <Section.Root>
              <Section.Header
                title={t`Webhooks`}
                description={t`Establish Webhook endpoints for notifications on asynchronous events.`}
              />
              <StyledTableContainer isMobile={isMobile}>
                <SettingsWebhooksTable />
                <TableFooter>
                  <NavigationButton
                    startIcon={<IconPlus />}
                    size="sm"
                    to={getSettingsPath(SettingsPath.NewWebhook)}
                    variant="outline"
                  >{t`Create webhook`}</NavigationButton>
                </TableFooter>
              </StyledTableContainer>
            </Section.Root>
          </StyledTabContent>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
