import { type MetadataEntityName } from '@/workspace/metadata/types/metadata-row.type';
import { type RecordQueryIdentity } from '@/workspace/record-api/types/record-query.type';

export type EventProperties = {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  updatedFields?: string[];
  diff?: Record<string, unknown>;
};
export type MetadataChange = {
  metadataName: MetadataEntityName | 'index';
  recordId: string;
  type: 'CREATED' | 'UPDATED' | 'DELETED';
  updatedCollectionHash?: string;
  properties: EventProperties;
};
export type RecordEvent = {
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'DESTROYED' | 'RESTORED';
  objectNameSingular: string;
  recordId: string;
  userId?: string;
  workspaceMemberId?: string;
  properties: EventProperties;
};
export type EventPayload = {
  eventStreamId: string;
  objectRecordEventsWithQueryIds: {
    queryIds: string[];
    objectRecordEvent: RecordEvent;
  }[];
  metadataEvents: MetadataChange[];
  queueJobEvents: never[];
};
export type StreamIdentity = RecordQueryIdentity & {
  sessionId: string;
  workspaceId: string;
  origin: string;
};
export type StreamAttachment = StreamIdentity & {
  eventStreamId: string;
  connectionId: string;
  createdAfterSequence: number;
};
export type QuerySignature = {
  objectNameSingular?: string;
  metadataName?: string;
  variables: Record<string, unknown>;
};
