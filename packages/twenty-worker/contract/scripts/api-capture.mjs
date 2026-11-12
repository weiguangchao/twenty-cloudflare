// Runs a scripted API scenario against the old server and appends each
// exchange to raw/<flow>.jsonl in the same format as the browser capture.
// Used for shapes the UI does not easily produce (error cases, field types).
// Usage: node api-capture.mjs <scenario-file.mjs>
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3000';
const FRONT_ORIGIN = process.env.FRONT_ORIGIN ?? 'http://localhost:3001';
const RAW_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'raw',
);

const findCapturedQuery = (operationName) => {
  for (const fileName of readdirSync(RAW_DIRECTORY)) {
    for (const line of readFileSync(join(RAW_DIRECTORY, fileName), 'utf8')
      .split('\n')
      .filter(Boolean)) {
      const exchange = JSON.parse(line);

      if (!exchange.requestBody?.startsWith('{')) continue;

      const body = JSON.parse(exchange.requestBody);

      if (body.operationName === operationName) return body.query;
    }
  }
  throw new Error(`No captured query for ${operationName}`);
};

const createClient = (flow) => {
  let accessToken = null;

  const send = async ({
    method = 'POST',
    path,
    operationName,
    query,
    variables,
    headers,
  }) => {
    const requestHeaders = {
      'content-type': 'application/json',
      origin: FRONT_ORIGIN,
      'x-locale': 'en',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    };

    for (const [name, value] of Object.entries(requestHeaders)) {
      if (value === null) delete requestHeaders[name];
    }
    const requestBody =
      method === 'POST'
        ? JSON.stringify({ operationName, query, variables })
        : null;
    const response = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
    });
    const contentType = response.headers.get('content-type') ?? '';
    const responseBytes = await response.arrayBuffer();
    const responseBody =
      contentType.includes('json') || contentType.startsWith('text/')
        ? new TextDecoder().decode(responseBytes)
        : `<${contentType || 'binary'} ${responseBytes.byteLength} bytes>`;

    appendFileSync(
      join(RAW_DIRECTORY, `${flow}.jsonl`),
      JSON.stringify({
        flow,
        capturedAt: new Date().toISOString(),
        method,
        url: `${SERVER_URL}${path}`,
        requestHeaders,
        requestBody,
        status: response.status,
        responseHeaders: Object.fromEntries(response.headers),
        responseBody,
      }) + '\n',
    );

    return {
      status: response.status,
      json: responseBody.startsWith('{') ? JSON.parse(responseBody) : null,
      setCookie: response.headers.get('set-cookie'),
    };
  };

  return {
    findCapturedQuery,
    get: (path, headers) => send({ method: 'GET', path, headers }),
    setAccessToken: (token) => (accessToken = token),
    metadata: (operationName, query, variables, headers) =>
      send({ path: '/metadata', operationName, query, variables, headers }),
    graphql: (operationName, query, variables, headers) =>
      send({ path: '/graphql', operationName, query, variables, headers }),
    signIn: async (email, password) => {
      const loginResult = await send({
        path: '/metadata',
        operationName: 'GetLoginTokenFromCredentials',
        query: findCapturedQuery('GetLoginTokenFromCredentials'),
        variables: { email, password, origin: FRONT_ORIGIN },
      });
      const loginToken =
        loginResult.json.data.getLoginTokenFromCredentials.loginToken.token;
      const tokensResult = await send({
        path: '/metadata',
        operationName: 'getAuthTokensFromLoginToken',
        query: findCapturedQuery('getAuthTokensFromLoginToken'),
        variables: { loginToken, origin: FRONT_ORIGIN },
      });

      accessToken =
        tokensResult.json.data.getAuthTokensFromLoginToken.tokens
          .accessOrWorkspaceAgnosticToken.token;

      return { loginToken, accessToken };
    },
  };
};

const scenarioPath = resolve(process.argv[2]);
const scenario = await import(pathToFileURL(scenarioPath).href);

await scenario.run(createClient(scenario.FLOW));
console.log(`done: ${scenario.FLOW}`);
