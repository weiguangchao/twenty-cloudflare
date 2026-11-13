import { isNonEmptyString } from '@sniptt/guards';
import { isPlainObject } from 'twenty-shared/utils';

import { requireWorkspace } from '@/auth/workspace-lifecycle.service';
import { type MetadataContext } from '@/metadata-api/types/metadata-context.type';
import { apiError } from '@/shared/errors/api-error.util';

const SETTING_VALUES: Record<string, readonly string[]> = {
  colorScheme: ['System', 'Light', 'Dark'],
  uiScale: ['Smaller', 'Default', 'Large', 'Larger'],
  openRecordIn: ['SIDE_PANEL', 'RECORD_PAGE'],
  dateFormat: ['SYSTEM', 'MONTH_FIRST', 'DAY_FIRST', 'YEAR_FIRST'],
  timeFormat: ['SYSTEM', 'HOUR_12', 'HOUR_24'],
  numberFormat: [
    'SYSTEM',
    'COMMAS_AND_DOT',
    'SPACES_AND_COMMA',
    'DOTS_AND_COMMA',
    'APOSTROPHE_AND_DOT',
  ],
};

export const updateProfile = async (
  context: MetadataContext,
  workspaceMemberId: string,
  input: unknown,
) => {
  const { auth, membership, workspace } = await requireWorkspace(context);
  if (workspaceMemberId !== membership.workspaceMemberId)
    throw apiError('Cannot update another workspace member', 'FORBIDDEN');
  if (workspace.activationStatus !== 'ACTIVE' || !isPlainObject(input))
    throw apiError('Invalid workspace member settings');

  const update: Record<
    string,
    string | number | { firstName: string; lastName: string }
  > = {};
  for (const [name, value] of Object.entries(input)) {
    if (name === 'name') {
      if (
        !isPlainObject(value) ||
        typeof value.firstName !== 'string' ||
        typeof value.lastName !== 'string' ||
        value.firstName.length > 100 ||
        value.lastName.length > 100
      )
        throw apiError('Invalid name');
      update.name = {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
      };
    } else if (name === 'calendarStartDay') {
      if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > 7
      )
        throw apiError('Invalid calendar start day');
      update[name] = value;
    } else if (
      [
        'jobTitle',
        'locale',
        'timeZone',
        ...Object.keys(SETTING_VALUES),
      ].includes(name)
    ) {
      if (
        typeof value !== 'string' ||
        value.length > 255 ||
        (SETTING_VALUES[name] && !SETTING_VALUES[name].includes(value))
      )
        throw apiError(`Invalid ${name}`);
      update[name] = value;
    } else {
      throw apiError(`Unsupported profile setting: ${name}`);
    }
  }

  if (typeof update.name === 'object') {
    if (membership.profilePending && !isNonEmptyString(update.name.firstName))
      throw apiError('First name is required');
  }
  await context
    .workspace(workspace.id)
    .updateWorkspaceMemberProfile(workspaceMemberId, update);
  if (typeof update.name === 'object') {
    await context.env.CORE_DB.batch([
      context.env.CORE_DB.prepare(
        'UPDATE "user" SET "firstName" = ?, "lastName" = ?, "updatedAt" = ? WHERE "id" = ?',
      ).bind(
        update.name.firstName,
        update.name.lastName,
        new Date().toISOString(),
        auth.userId,
      ),
      context.env.CORE_DB.prepare(
        'UPDATE "userWorkspace" SET "profilePending" = 0, "previousOnboardingStatus" = CASE WHEN "profilePending" = 1 THEN ? ELSE "previousOnboardingStatus" END WHERE "id" = ?',
      ).bind('PROFILE_CREATION', membership.id),
    ]);
  }

  return true;
};
