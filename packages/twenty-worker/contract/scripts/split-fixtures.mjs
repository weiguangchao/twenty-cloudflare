// Turns raw/<flow>.jsonl captures into one redacted JSON file per exchange
// under fixtures/<flow>/. See contract/README.md for the fixture format.
// Usage: node split-fixtures.mjs
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTRACT_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIRECTORY = join(CONTRACT_DIRECTORY, 'raw');
const FIXTURES_DIRECTORY = join(CONTRACT_DIRECTORY, 'fixtures');

// Flows in the order they were captured; later flows depend on state created
// by earlier ones, so replay should follow this order.
const FLOW_ORDER = [
  'auth-signup-onboarding',
  'auth-signout-signin',
  'auth-api',
  'records-bulk-create-api',
  'records-list',
  'record-detail',
  'record-field-types-api',
  'record-lifecycle',
  'notes-tasks',
  'search',
  'data-model',
  'data-model-api',
  'custom-object-records',
  'custom-object-records-api',
  'views',
  'files',
  'file-access-api',
  'members-roles',
  'permissions-api',
  'removed-member-api',
  'cleanup-api',
];

const KEPT_REQUEST_HEADERS = new Set([
  'content-type',
  'origin',
  'x-locale',
  'x-twenty-session-cookie',
  'x-app-version',
  'authorization',
  'cookie',
  'range',
]);
const KEPT_RESPONSE_HEADERS = new Set([
  'content-type',
  'set-cookie',
  'content-range',
  'content-length',
  'cache-control',
  'content-disposition',
]);

const LARGE_RESPONSE_OMISSION_THRESHOLD = 100_000;

const SECRET_PATTERNS = [
  {
    kind: 'jwt',
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  },
  { kind: 'session', pattern: /sess_[A-Za-z0-9_-]+/g },
  {
    kind: 'invite-path',
    pattern:
      /\/invite\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
  },
];
const placeholders = new Map();
const placeholderCounts = new Map();

const placeholderFor = (kind, secret) => {
  const key = `${kind}:${secret}`;

  if (!placeholders.has(key)) {
    const count = (placeholderCounts.get(kind) ?? 0) + 1;

    placeholderCounts.set(kind, count);
    placeholders.set(key, `<redacted-${kind}-${count}>`);
  }
  return placeholders.get(key);
};

const redactString = (value) =>
  SECRET_PATTERNS.reduce(
    (text, { kind, pattern }) =>
      text.replace(pattern, (secret) => placeholderFor(kind, secret)),
    value,
  );

const redactCookieHeader = (value) =>
  value
    .split(/;\s*/)
    .map((cookie) => {
      const [name, ...rest] = cookie.split('=');

      if (rest.length === 0) return cookie;
      if (/session/i.test(name))
        return `${name}=${redactString(rest.join('='))}`;

      return `${name}=<redacted-cookie>`;
    })
    .join('; ');

const redactSetCookieHeader = (value) =>
  value
    .split('\n')
    .map((line) => {
      const [pair, ...attributes] = line.split(/;\s*/);
      const [name, ...rest] = pair.split('=');
      const cookieValue = rest.join('=');
      const redactedValue =
        cookieValue === '' || /session/i.test(name)
          ? redactString(cookieValue)
          : '<redacted-cookie>';

      return [`${name}=${redactedValue}`, ...attributes].join('; ');
    })
    .join('\n');

const pickHeaders = (headers, keptNames) => {
  const picked = {};

  for (const [name, value] of Object.entries(headers ?? {})) {
    const lowerName = name.toLowerCase();

    if (!keptNames.has(lowerName)) continue;
    if (lowerName === 'cookie') picked[lowerName] = redactCookieHeader(value);
    else if (lowerName === 'set-cookie')
      picked[lowerName] = redactSetCookieHeader(value);
    else if (lowerName === 'authorization')
      picked[lowerName] = redactString(value);
    else picked[lowerName] = value;
  }
  return picked;
};

const parseJson = (text) => {
  if (typeof text !== 'string') return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const SECRET_KEYS = new Set(['inviteHash', 'workspaceInviteHash']);

const redactDeep = (value, key) => {
  if (typeof value === 'string' && SECRET_KEYS.has(key)) {
    return placeholderFor('invite-hash', value);
  }
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, key));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nested]) => [
        nestedKey,
        redactDeep(nested, nestedKey),
      ]),
    );
  }
  return value;
};

const describeExchange = (exchange) => {
  const url = new URL(exchange.url);
  const endpoint = url.pathname;
  const body = parseJson(exchange.requestBody);

  if (endpoint === '/metadata' || endpoint === '/graphql') {
    const isEventStream = body === null || body === undefined;

    return {
      endpoint,
      operationName: isEventStream
        ? 'EventStreamSubscription'
        : (body.operationName ??
          body.query?.match(
            /^\s*(?:query|mutation|subscription)\s+(\w+)/,
          )?.[1] ??
          'Anonymous'),
      query: body?.query ?? null,
      variables: body?.variables ?? null,
    };
  }

  const folder = endpoint.split('/')[2] ?? '';

  return {
    endpoint: `${endpoint
      .split('/')
      .slice(0, endpoint.startsWith('/file/') ? 3 : 2)
      .join('/')}`,
    operationName: `${exchange.method} ${endpoint.startsWith('/file/') ? `/file/${folder}` : endpoint.split('/').slice(0, 2).join('/')}`,
    query: null,
    variables: Object.fromEntries(url.searchParams),
    path: url.pathname,
  };
};

const fileNameFor = (sequence, operationName) =>
  `${String(sequence).padStart(3, '0')}-${operationName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}.json`;

rmSync(FIXTURES_DIRECTORY, { recursive: true, force: true });

const rawFlows = readdirSync(RAW_DIRECTORY)
  .filter((fileName) => fileName.endsWith('.jsonl'))
  .map((fileName) => fileName.replace(/\.jsonl$/, ''));
const unknownFlows = rawFlows.filter((flow) => !FLOW_ORDER.includes(flow));

if (unknownFlows.length > 0) {
  throw new Error(`Add these flows to FLOW_ORDER: ${unknownFlows.join(', ')}`);
}

const firstFixtureByResponseHash = new Map();
const index = [];

for (const flow of FLOW_ORDER.filter((name) => rawFlows.includes(name))) {
  const exchanges = readFileSync(join(RAW_DIRECTORY, `${flow}.jsonl`), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const seenInFlow = new Map();
  const flowDirectory = join(FIXTURES_DIRECTORY, flow);
  let sequence = 0;

  mkdirSync(flowDirectory, { recursive: true });

  for (const exchange of exchanges) {
    const description = describeExchange(exchange);
    const response = redactDeep(parseJson(exchange.responseBody));
    const variables = redactDeep(description.variables);
    const exactKey = JSON.stringify([
      description.operationName,
      description.query,
      variables,
      exchange.status,
      response,
    ]);

    if (seenInFlow.has(exactKey)) {
      seenInFlow.get(exactKey).repeatCount += 1;
      continue;
    }

    sequence += 1;
    const fileName = fileNameFor(sequence, description.operationName);
    const responseHash = createHash('sha256')
      .update(JSON.stringify(response) ?? 'null')
      .digest('hex');
    const isLargeResponse = (JSON.stringify(response) ?? '').length > 20000;
    const earlierFixture = firstFixtureByResponseHash.get(responseHash);

    const fixture = {
      flow,
      sequence,
      capturedAt: exchange.capturedAt,
      endpoint: description.endpoint,
      method: exchange.method,
      ...(description.path ? { path: redactString(description.path) } : {}),
      operationName: description.operationName,
      query: description.query,
      variables,
      requestBody:
        description.query === null && exchange.method !== 'GET'
          ? redactDeep(parseJson(exchange.requestBody))
          : undefined,
      requestHeaders: pickHeaders(
        exchange.requestHeaders,
        KEPT_REQUEST_HEADERS,
      ),
      status: exchange.status,
      responseHeaders: pickHeaders(
        exchange.responseHeaders,
        KEPT_RESPONSE_HEADERS,
      ),
      ...(isLargeResponse && earlierFixture
        ? { responseRef: earlierFixture }
        : { response }),
      repeatCount: 1,
    };

    if (isLargeResponse && !earlierFixture) {
      firstFixtureByResponseHash.set(responseHash, `${flow}/${fileName}`);
    }

    seenInFlow.set(exactKey, fixture);
    fixture.fileName = fileName;
  }

  // Metadata collections are re-fetched after every data model change; the
  // intermediate copies only differ in content, so keep the first and last.
  const fixtures = [...seenInFlow.values()];

  fixtures.forEach((fixture, position) => {
    const size = (JSON.stringify(fixture.response) ?? '').length;
    const isFirstOfOperation =
      fixtures.findIndex(
        (other) => other.operationName === fixture.operationName,
      ) === position;
    const isLastOfOperation =
      fixtures.findLastIndex(
        (other) => other.operationName === fixture.operationName,
      ) === position;

    if (
      size > LARGE_RESPONSE_OMISSION_THRESHOLD &&
      !isFirstOfOperation &&
      !isLastOfOperation
    ) {
      fixture.responseOmitted = {
        reason:
          'intermediate copy of a large collection, see the first and last fixture of this operation in the flow',
        bytes: size,
      };
      delete fixture.response;
    }
  });

  for (const fixture of fixtures) {
    const { fileName, ...content } = fixture;

    writeFileSync(
      join(flowDirectory, fileName),
      JSON.stringify(content, null, 2) + '\n',
    );
    index.push({
      flow,
      file: `${flow}/${fileName}`,
      endpoint: content.endpoint,
      operationName: content.operationName,
      status: content.status,
      hasErrors:
        typeof content.response === 'object' &&
        content.response !== null &&
        Array.isArray(content.response.errors),
      repeatCount: content.repeatCount,
    });
  }
}

writeFileSync(
  join(FIXTURES_DIRECTORY, 'index.json'),
  JSON.stringify(index, null, 2) + '\n',
);

console.log(`${index.length} fixtures in ${FLOW_ORDER.length} flows`);
