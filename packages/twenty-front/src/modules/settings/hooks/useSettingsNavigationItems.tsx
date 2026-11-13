import { SettingsPath } from 'twenty-shared/types';
import { useAuth } from '@/auth/hooks/useAuth';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { supportChatState } from '@/client-config/states/supportChatState';
import { permissionFlagMapSelector } from '@/settings/roles/states/permissionFlagMapSelector';
import { getDocumentationUrl } from '@/support/utils/getDocumentationUrl';
import { type NavigationDrawerItemModifier } from '@/ui/navigation/navigation-drawer/types/NavigationDrawerItemModifier';
import { type NavigationDrawerItemIndentationLevel } from '@/ui/navigation/navigation-drawer/types/NavigationDrawerItemIndentationLevel';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isNonEmptyString } from '@sniptt/guards';
import {
  IconAppWindow,
  IconCode,
  IconColorSwatch,
  type IconComponent,
  IconDoorEnter,
  IconHelpCircle,
  IconHierarchy,
  IconMessage,
  IconSettings2,
  IconUserCircle,
  IconUsers,
} from 'twenty-ui/icon';
import { PermissionFlagType } from '~/generated-metadata/graphql';
import { openUrlInNewTab } from '~/utils/openUrlInNewTab';
import { useLingui } from '@lingui/react/macro';

export type SettingsNavigationSection = {
  label: string;
  items: SettingsNavigationItem[];
};

export type SettingsNavigationItem = {
  label: string;
  path?: SettingsPath;
  onClick?: () => void;
  Icon: IconComponent;
  indentationLevel?: NavigationDrawerItemIndentationLevel;
  matchSubPages?: boolean;
  isHidden?: boolean;
  subItems?: SettingsNavigationItem[];
  modifier?: NavigationDrawerItemModifier;
};

const useSettingsNavigationItems = (): SettingsNavigationSection[] => {
  const { t } = useLingui();
  const { signOut } = useAuth();
  const supportChat = useAtomStateValue(supportChatState);
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const isSupportChatConfigured =
    supportChat?.supportDriver === 'FRONT' &&
    isNonEmptyString(supportChat.supportFrontChatId);

  const permissionFlagMap = useAtomStateValue(permissionFlagMapSelector);

  return [
    {
      label: t`User`,
      items: [
        {
          label: t`Profile`,
          path: SettingsPath.ProfilePage,
          Icon: IconUserCircle,
        },
        {
          label: t`Experience`,
          path: SettingsPath.Experience,
          Icon: IconColorSwatch,
        },
      ],
    },
    {
      label: t`Workspace`,
      items: [
        {
          label: t`General`,
          path: SettingsPath.General,
          Icon: IconSettings2,
          isHidden: !permissionFlagMap[PermissionFlagType.WORKSPACE],
        },
        {
          label: t`Data model`,
          path: SettingsPath.Objects,
          Icon: IconHierarchy,
          isHidden: !permissionFlagMap[PermissionFlagType.DATA_MODEL],
        },
        {
          label: t`Layout`,
          path: SettingsPath.Layout,
          Icon: IconAppWindow,
          isHidden: !permissionFlagMap[PermissionFlagType.LAYOUTS],
        },
        {
          label: t`Members`,
          path: SettingsPath.WorkspaceMembersPage,
          Icon: IconUsers,
          isHidden: !permissionFlagMap[PermissionFlagType.WORKSPACE_MEMBERS],
        },
        {
          label: t`Developers`,
          path: SettingsPath.Developers,
          Icon: IconCode,
          isHidden:
            !permissionFlagMap[PermissionFlagType.API_KEYS_AND_WEBHOOKS],
        },
      ],
    },
    {
      label: t`Other`,
      items: [
        {
          label: t`Support`,
          onClick: () => window.FrontChat?.('show'),
          Icon: IconMessage,
          isHidden: !isSupportChatConfigured,
        },
        {
          label: t`Documentation`,
          onClick: () =>
            openUrlInNewTab(
              getDocumentationUrl({ locale: currentWorkspaceMember?.locale }),
            ),
          Icon: IconHelpCircle,
        },
        {
          label: t`Logout`,
          onClick: signOut,
          Icon: IconDoorEnter,
          matchSubPages: false,
        },
      ],
    },
  ];
};

export { useSettingsNavigationItems };
