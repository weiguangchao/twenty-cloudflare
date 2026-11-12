// Exports the /metadata and /graphql SDL of the running old server via
// introspection. Usage: node export-sdl.mjs <email> <password>
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
} = require('graphql');

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3000';
const FRONT_ORIGIN = process.env.FRONT_ORIGIN ?? 'http://localhost:3001';
const CONTRACT_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '..');

const [email, password] = process.argv.slice(2);

const post = async (path, query, variables, accessToken) => {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: FRONT_ORIGIN,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();

  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }

  return json.data;
};

const loginData = await post(
  '/metadata',
  `mutation ($email: String!, $password: String!, $origin: String!) {
    getLoginTokenFromCredentials(email: $email, password: $password, origin: $origin) {
      loginToken { token }
    }
  }`,
  { email, password, origin: FRONT_ORIGIN },
);
const tokensData = await post(
  '/metadata',
  `mutation ($loginToken: String!, $origin: String!) {
    getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) {
      tokens { accessOrWorkspaceAgnosticToken { token } }
    }
  }`,
  {
    loginToken: loginData.getLoginTokenFromCredentials.loginToken.token,
    origin: FRONT_ORIGIN,
  },
);
const accessToken =
  tokensData.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken
    .token;

for (const [path, fileName] of [
  ['/metadata', 'metadata-schema.graphql'],
  ['/graphql', 'core-schema.graphql'],
]) {
  const introspection = await post(
    path,
    getIntrospectionQuery({ descriptions: true }),
    {},
    accessToken,
  );

  writeFileSync(
    join(CONTRACT_DIRECTORY, fileName),
    printSchema(buildClientSchema(introspection)) + '\n',
  );
  console.log(`wrote ${fileName}`);
}
