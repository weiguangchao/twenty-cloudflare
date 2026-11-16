import { type GraphQLInputObjectType } from 'graphql';

export type McpRequest = {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
};

export type McpResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
};

export type McpTool = {
  name: string;
  description: string;
  category: string;
  inputType: GraphQLInputObjectType;
  readOnly: boolean;
  execute: (input: Record<string, unknown>) => Record<string, unknown>;
};
