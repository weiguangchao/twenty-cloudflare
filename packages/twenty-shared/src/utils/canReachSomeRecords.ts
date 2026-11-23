import { type ObjectRecordsOperationType } from '@/types/ObjectRecordsOperationType';
import { type ObjectRecordsPermissions } from '@/types/ObjectRecordsPermissions';
import { canReachAllRecords } from '@/utils/canReachAllRecords';
import { isDefined } from '@/utils/validation/isDefined';

export const canReachSomeRecords = ({
  objectRecordsPermissions,
  operationType,
}: {
  objectRecordsPermissions: ObjectRecordsPermissions | undefined;
  operationType: ObjectRecordsOperationType;
}): boolean =>
  isDefined(objectRecordsPermissions) &&
  canReachAllRecords({ objectRecordsPermissions, operationType });
