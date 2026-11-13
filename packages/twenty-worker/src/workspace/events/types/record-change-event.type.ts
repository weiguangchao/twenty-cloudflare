import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
  type ObjectRecordDeleteEvent,
  type ObjectRecordDestroyEvent,
  type ObjectRecordRestoreEvent,
} from 'twenty-shared/database-events';
import { type RecordData } from '@/workspace/record-api/types/record-query.type';

export type RecordChangeEvent =
  | ObjectRecordCreateEvent<RecordData>
  | ObjectRecordUpdateEvent<RecordData>
  | ObjectRecordDeleteEvent<RecordData>
  | ObjectRecordDestroyEvent<RecordData>
  | ObjectRecordRestoreEvent<RecordData>;
export type RecordChangeAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'destroyed'
  | 'restored';
