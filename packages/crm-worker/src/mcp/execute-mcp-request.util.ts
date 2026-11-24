import { GraphQLError } from 'graphql';
import { isPlainObject } from 'crm-shared/utils';

import { MCP_PROTOCOL_VERSIONS, MCP_SERVER_INFO } from '@/mcp/mcp.constants';
import {
  buildMcpTools,
  executeMcpTool,
  listMcpTool,
} from '@/mcp/mcp-tools.util';
import { type McpRequest, type McpResponse } from '@/mcp/types/mcp.type';
import {
  type RecordQueryContext,
  type RecordQueryInput,
} from '@/workspace/record-api/types/record-query.type';

export const executeMcpRequest = (
  request: McpRequest,
  context: RecordQueryContext,
  executeQuery: (input: RecordQueryInput) => string,
  metaMode: boolean,
): McpResponse | null => {
  if (request.id === undefined) return null;
  const response = (result: unknown): McpResponse => ({
    jsonrpc: '2.0',
    id: request.id!,
    result,
  });
  const failure = (code: number, message: string): McpResponse => ({
    jsonrpc: '2.0',
    id: request.id!,
    error: { code, message },
  });
  const parameters = request.params ?? {};
  if (request.method === 'initialize') {
    if (
      typeof parameters.protocolVersion !== 'string' ||
      !isPlainObject(parameters.capabilities) ||
      !isPlainObject(parameters.clientInfo) ||
      typeof parameters.clientInfo.name !== 'string' ||
      typeof parameters.clientInfo.version !== 'string'
    )
      return failure(
        -32602,
        'initialize requires protocolVersion, capabilities and clientInfo',
      );
    return response({
      protocolVersion: MCP_PROTOCOL_VERSIONS.includes(
        parameters.protocolVersion,
      )
        ? parameters.protocolVersion
        : MCP_PROTOCOL_VERSIONS[0],
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
        prompts: { listChanged: false },
      },
      serverInfo: MCP_SERVER_INFO,
      instructions: `Use list_object_metadata_names to discover readable CRM objects. Tools follow find_many_{plural}, find_one_{singular}, create_one_{singular}, update_one_{singular}, delete_one_{singular} and corresponding many forms. Find filters are top-level arguments; select lists response fields. ${metaMode ? 'Use learn_tools for schemas and execute_tool to call CRM tools.' : 'tools/list provides schemas for calling CRM tools directly.'} delete is reversible; destroy and merge permanently remove records. Tools and fields reflect current permissions. Writes affect at most 200 records. Workflow, AI, applications and account administration are unavailable.`,
    });
  }
  if (request.method === 'ping') return response({});
  if (request.method === 'resources/list') return response({ resources: [] });
  if (request.method === 'resources/templates/list')
    return response({ resourceTemplates: [] });
  if (request.method === 'prompts/list') return response({ prompts: [] });
  if (!['tools/list', 'tools/call'].includes(request.method))
    return failure(-32601, 'Method not found');
  const tools = buildMcpTools(context, executeQuery);
  if (request.method === 'tools/list') {
    if (parameters.cursor !== undefined)
      return failure(-32602, 'Invalid tool cursor');
    return response({
      tools: [...tools.values()]
        .filter((tool) =>
          metaMode
            ? tool.category !== 'DATABASE_CRUD'
            : tool.category !== 'DISCOVERY',
        )
        .map(listMcpTool),
    });
  }
  if (
    typeof parameters.name !== 'string' ||
    (parameters.arguments !== undefined && !isPlainObject(parameters.arguments))
  )
    return failure(
      -32602,
      'tools/call requires a tool name and object arguments',
    );
  if (!tools.has(parameters.name))
    return failure(-32602, 'Tool is unavailable');
  try {
    const result = executeMcpTool(tools, parameters.name, parameters.arguments);
    return response({
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result,
      isError: false,
    });
  } catch (error) {
    const message =
      error instanceof GraphQLError ? error.message : 'Unable to execute tool';
    return response({
      content: [{ type: 'text', text: message }],
      isError: true,
    });
  }
};
