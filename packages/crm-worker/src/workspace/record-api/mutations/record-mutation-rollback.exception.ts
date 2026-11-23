export class RecordMutationRollback extends Error {
  constructor(readonly response: string) {
    super('Record mutation rolled back');
  }
}
