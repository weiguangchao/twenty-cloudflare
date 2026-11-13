// Interfaces rather than inline object types, so the recursive RPC
// Serializable check in workers-types terminates.
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface JsonArray extends Array<JsonValue> {}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonArray
  | JsonObject;
