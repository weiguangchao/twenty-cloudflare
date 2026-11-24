import { createContext } from 'react';
import { type RecordFilterValueDependencies } from 'crm-shared/types';

export type RecordFilterValueDependenciesContextValue = Pick<
  RecordFilterValueDependencies,
  'currentRecord'
>;

export const RecordFilterValueDependenciesContext =
  createContext<RecordFilterValueDependenciesContextValue>({});
