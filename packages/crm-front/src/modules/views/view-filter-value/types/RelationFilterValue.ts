import { type jsonRelationFilterValueSchema } from 'crm-shared/utils';
import { type z } from 'zod';

export type RelationFilterValue = z.infer<typeof jsonRelationFilterValueSchema>;
