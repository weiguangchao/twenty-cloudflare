import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { SettingsRolesList } from '@/settings/roles/components/SettingsRolesList';
import { settingsPersistedRoleFamilyState } from '@/settings/roles/states/settingsPersistedRoleFamilyState';
import { settingsRoleIdsState } from '@/settings/roles/states/settingsRoleIdsState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { ComponentWithRouterDecorator } from '~/testing/decorators/ComponentWithRouterDecorator';
import { mockedRoles } from '~/testing/mock-data/generated/metadata/roles/mock-roles-data';

const ROLES = [
  ...mockedRoles,
  {
    ...mockedRoles[1],
    id: 'api-key-only-role',
    label: 'API key only',
    canBeAssignedToUsers: false,
    canBeAssignedToAgents: false,
    canBeAssignedToApiKeys: true,
    workspaceMembers: [],
  },
];

const meta: Meta<typeof SettingsRolesList> = {
  title: 'Modules/Settings/Roles/SettingsRolesList',
  component: SettingsRolesList,
  decorators: [ComponentWithRouterDecorator],
  beforeEach: () => {
    jotaiStore.set(
      settingsRoleIdsState.atom,
      ROLES.map((role) => role.id),
    );

    for (const role of ROLES) {
      jotaiStore.set(
        settingsPersistedRoleFamilyState.atomFamily(role.id),
        role,
      );
    }
  },
};

export default meta;
type Story = StoryObj<typeof SettingsRolesList>;

export const FilterPanelTogglesStayOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    expect(await canvas.findByText('Admin')).toBeVisible();
    expect(canvas.queryByText('API key only')).not.toBeInTheDocument();

    const trigger = canvas.getByRole('button', { name: 'Filter' });

    await userEvent.click(trigger);
    const popup = await body.findByRole('dialog', { name: 'Filter' });
    const apiKeyRoles = within(popup).getByRole('switch', {
      name: 'API key roles',
    });

    await waitFor(() => expect(apiKeyRoles).toHaveFocus());
    await userEvent.keyboard(' ');
    expect(apiKeyRoles).toBeChecked();
    expect(await canvas.findByText('API key only')).toBeVisible();
    expect(popup).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(popup).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
