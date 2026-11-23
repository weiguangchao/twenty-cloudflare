import { lazy, Suspense } from 'react';
import {
  createRoutesFromElements,
  Navigate,
  Outlet,
  parsePath,
  Route,
} from 'react-router-dom';
import {
  type WorkspaceRouteHandle,
  type WorkspaceRouteObject,
} from '@/app/routing/types/WorkspaceRouteObject';
import { SettingsProtectedRouteWrapper } from '@/settings/components/SettingsProtectedRouteWrapper';
import { SettingsSkeletonLoader } from '@/settings/components/SettingsSkeletonLoader';
import { SettingsPath } from 'crm-shared/types';
import { PermissionFlagType } from '~/generated-metadata/graphql';
const SettingsGraphQLPlayground = lazy(() =>
  import('~/pages/settings/developers/playground/SettingsGraphQLPlayground').then(
    (module) => ({
      default: module.SettingsGraphQLPlayground,
    }),
  ),
);

const SettingsRestPlayground = lazy(() =>
  import('~/pages/settings/developers/playground/SettingsRestPlayground').then(
    (module) => ({
      default: module.SettingsRestPlayground,
    }),
  ),
);

const SettingsNewObject = lazy(() =>
  import('~/pages/settings/data-model/SettingsNewObject').then((module) => ({
    default: module.SettingsNewObject,
  })),
);

const SettingsObjectDetailPage = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectDetailPage').then(
    (module) => ({
      default: module.SettingsObjectDetailPage,
    }),
  ),
);

const SettingsObjectOverview = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectOverview').then(
    (module) => ({
      default: module.SettingsObjectOverview,
    }),
  ),
);

const SettingsDevelopersApiKeyDetail = lazy(() =>
  import('~/pages/settings/developers/api-keys/SettingsDevelopersApiKeyDetail').then(
    (module) => ({
      default: module.SettingsDevelopersApiKeyDetail,
    }),
  ),
);

const SettingsDevelopersApiKeysNew = lazy(() =>
  import('~/pages/settings/developers/api-keys/SettingsDevelopersApiKeysNew').then(
    (module) => ({
      default: module.SettingsDevelopersApiKeysNew,
    }),
  ),
);

const SettingsGeneral = lazy(() =>
  import('~/pages/settings/general/SettingsGeneral').then((module) => ({
    default: module.SettingsGeneral,
  })),
);

const SettingsDevelopers = lazy(() =>
  import('~/pages/settings/developers/SettingsDevelopers').then((module) => ({
    default: module.SettingsDevelopers,
  })),
);

const SettingsLayout = lazy(() =>
  import('~/pages/settings/layout/SettingsLayout').then((module) => ({
    default: module.SettingsLayout,
  })),
);

const SettingsWorkspaceMembers = lazy(() =>
  import('~/pages/settings/members/SettingsWorkspaceMembers').then(
    (module) => ({
      default: module.SettingsWorkspaceMembers,
    }),
  ),
);

const SettingsWorkspaceMember = lazy(() =>
  import('~/pages/settings/members/SettingsWorkspaceMember').then((module) => ({
    default: module.SettingsWorkspaceMember,
  })),
);

const SettingsProfile = lazy(() =>
  import('~/pages/settings/profile/SettingsProfile').then((module) => ({
    default: module.SettingsProfile,
  })),
);

const SettingsExperience = lazy(() =>
  import('~/pages/settings/profile/appearance/components/SettingsExperience').then(
    (module) => ({
      default: module.SettingsExperience,
    }),
  ),
);

const SettingsObjects = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjects').then((module) => ({
    default: module.SettingsObjects,
  })),
);

const SettingsDevelopersWebhookNew = lazy(() =>
  import('~/pages/settings/developers/webhooks/components/SettingsDevelopersWebhookNew').then(
    (module) => ({
      default: module.SettingsDevelopersWebhookNew,
    }),
  ),
);

const SettingsDevelopersWebhookDetail = lazy(() =>
  import('~/pages/settings/developers/webhooks/components/SettingsDevelopersWebhookDetail').then(
    (module) => ({
      default: module.SettingsDevelopersWebhookDetail,
    }),
  ),
);

const SettingsObjectNewFieldSelect = lazy(() =>
  import('~/pages/settings/data-model/new-field/SettingsObjectNewFieldSelect').then(
    (module) => ({
      default: module.SettingsObjectNewFieldSelect,
    }),
  ),
);

const SettingsObjectNewFieldConfigure = lazy(() =>
  import('~/pages/settings/data-model/new-field/SettingsObjectNewFieldConfigure').then(
    (module) => ({
      default: module.SettingsObjectNewFieldConfigure,
    }),
  ),
);

const SettingsObjectNewIndex = lazy(() =>
  import('~/pages/settings/data-model/new-index/SettingsObjectNewIndex').then(
    (module) => ({
      default: module.SettingsObjectNewIndex,
    }),
  ),
);

const SettingsObjectFieldEdit = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectFieldEdit').then(
    (module) => ({
      default: module.SettingsObjectFieldEdit,
    }),
  ),
);

const SettingsObjectSearch = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectSearch').then((module) => ({
    default: module.SettingsObjectSearch,
  })),
);

const SettingsObjectIndexes = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectIndexes').then(
    (module) => ({
      default: module.SettingsObjectIndexes,
    }),
  ),
);

const SettingsObjectTranslations = lazy(() =>
  import('~/pages/settings/data-model/SettingsObjectTranslations').then(
    (module) => ({
      default: module.SettingsObjectTranslations,
    }),
  ),
);

const SettingsRoleCreate = lazy(() =>
  import('~/pages/settings/members/roles/SettingsRoleCreate').then(
    (module) => ({
      default: module.SettingsRoleCreate,
    }),
  ),
);

const SettingsRoleEdit = lazy(() =>
  import('~/pages/settings/members/roles/SettingsRoleEdit').then((module) => ({
    default: module.SettingsRoleEdit,
  })),
);

const SettingsRoleObjectLevel = lazy(() =>
  import('~/pages/settings/members/roles/SettingsRoleObjectLevel').then(
    (module) => ({
      default: module.SettingsRoleObjectLevel,
    }),
  ),
);

const SettingsRoleAddObjectLevel = lazy(() =>
  import('~/pages/settings/members/roles/SettingsRoleAddObjectLevel').then(
    (module) => ({
      default: module.SettingsRoleAddObjectLevel,
    }),
  ),
);
type CreateSettingsRouteObjectsArgs = { isAdminPageEnabled?: boolean };
type SettingsRouteHandle = WorkspaceRouteHandle;

const MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE: SettingsRouteHandle = {
  workspaceSurfaces: ['main', 'side-panel'],
};

const EXPANDABLE_SETTINGS_ROUTE_HANDLE: SettingsRouteHandle = {
  ...MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE,
  isLocationExpandableFromSidePanel: true,
};

const MEMBERS_LIST_SETTINGS_ROUTE_HANDLE: SettingsRouteHandle = {
  ...MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE,
  isLocationExpandableFromSidePanel: ({ location }) => {
    const hash =
      typeof location === 'string'
        ? (parsePath(location).hash ?? '')
        : (location.hash ?? '');

    return hash === '' || hash === '#team' || hash === '#roles';
  },
};

const createSettingsRouteElements = (_args: CreateSettingsRouteObjectsArgs) => (
  <>
    <Route path={SettingsPath.ProfilePage} element={<SettingsProfile />} />
    <Route path={SettingsPath.Experience} element={<SettingsExperience />} />
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.WORKSPACE}
        />
      }
    >
      <Route path={SettingsPath.General} element={<SettingsGeneral />} />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.LAYOUTS}
        />
      }
    >
      <Route path={SettingsPath.Layout} element={<SettingsLayout />} />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.WORKSPACE_MEMBERS}
        />
      }
    >
      <Route
        path={SettingsPath.WorkspaceMembersPage}
        element={<SettingsWorkspaceMembers />}
        handle={MEMBERS_LIST_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.WorkspaceMemberPage}
        element={<SettingsWorkspaceMember />}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.DATA_MODEL}
        />
      }
    >
      <Route
        path={SettingsPath.Objects}
        element={<SettingsObjects />}
        handle={EXPANDABLE_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectOverview}
        element={<SettingsObjectOverview />}
        handle={EXPANDABLE_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectDetail}
        element={<SettingsObjectDetailPage />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.NewObject}
        element={<SettingsNewObject />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectNewFieldSelect}
        element={<SettingsObjectNewFieldSelect />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectNewFieldConfigure}
        element={<SettingsObjectNewFieldConfigure />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectNewIndex}
        element={<SettingsObjectNewIndex />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectFieldEdit}
        element={<SettingsObjectFieldEdit />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectTranslations}
        element={<SettingsObjectTranslations />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectSearch}
        element={<SettingsObjectSearch />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectIndexes}
        element={<SettingsObjectIndexes />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.ObjectFieldTranslations}
        element={<SettingsObjectTranslations />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.ROLES}
        />
      }
    >
      <Route
        path={SettingsPath.Roles}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
        element={
          <Navigate
            to={`/settings/${SettingsPath.WorkspaceMembersPage}#roles`}
            replace
          />
        }
      />
      <Route
        path={SettingsPath.RoleDetail}
        element={<SettingsRoleEdit />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.RoleCreate}
        element={<SettingsRoleCreate />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.RoleObjectLevel}
        element={<SettingsRoleObjectLevel />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
      <Route
        path={SettingsPath.RoleAddObjectLevel}
        element={<SettingsRoleAddObjectLevel />}
        handle={MAIN_AND_SIDE_PANEL_SETTINGS_ROUTE_HANDLE}
      />
    </Route>
    <Route
      element={
        <SettingsProtectedRouteWrapper
          settingsPermission={PermissionFlagType.API_KEYS_AND_WEBHOOKS}
        />
      }
    >
      <Route path={SettingsPath.Developers} element={<SettingsDevelopers />} />
      <Route
        path={`${SettingsPath.GraphQLPlayground}`}
        element={<SettingsGraphQLPlayground />}
      />
      <Route
        path={`${SettingsPath.RestPlayground}/*`}
        element={<SettingsRestPlayground />}
      />
      <Route
        path={SettingsPath.NewApiKey}
        element={<SettingsDevelopersApiKeysNew />}
      />
      <Route
        path={SettingsPath.ApiKeyDetail}
        element={<SettingsDevelopersApiKeyDetail />}
      />
      <Route
        path={SettingsPath.NewWebhook}
        element={<SettingsDevelopersWebhookNew />}
      />
      <Route
        path={SettingsPath.WebhookDetail}
        element={<SettingsDevelopersWebhookDetail />}
      />
    </Route>
  </>
);
const removeGeneratedRouteIds = (
  routeObjects: WorkspaceRouteObject[],
): WorkspaceRouteObject[] =>
  routeObjects.map(({ id: _generatedId, children, ...routeObject }) => ({
    ...routeObject,
    children: children && removeGeneratedRouteIds(children),
  }));

export const createSettingsRouteObjects = (
  args: CreateSettingsRouteObjectsArgs,
): WorkspaceRouteObject[] =>
  removeGeneratedRouteIds(
    createRoutesFromElements(
      createSettingsRouteElements(args),
    ) as WorkspaceRouteObject[],
  );

export const SettingsRouteOutlet = () => (
  <Suspense fallback={<SettingsSkeletonLoader />}>
    <Outlet />
  </Suspense>
);
