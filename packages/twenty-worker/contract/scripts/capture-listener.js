// Attach with the Playwright MCP browser_run_code_unsafe tool (filename option).
// The MCP sandbox has no fs, so exchanges are posted to collector.mjs.
// Keep the file a bare function expression with no trailing semicolon: the
// MCP tool wraps it as `await (<file>)(page)`.
async (page) => {
  const COLLECTOR_URL = 'http://localhost:9477/exchange';
  const context = page.context();

  if (context.__twentyCaptureAttached) {
    return 'already attached';
  }
  context.__twentyCaptureAttached = true;

  const isCapturedUrl = (url) => {
    const { pathname } = new URL(url);

    return (
      pathname === '/metadata' ||
      pathname === '/graphql' ||
      pathname.startsWith('/file-upload') ||
      pathname.startsWith('/file/') ||
      pathname.startsWith('/client-config')
    );
  };

  context.on('response', async (response) => {
    const request = response.request();

    if (!isCapturedUrl(request.url())) {
      return;
    }

    const responseHeaders = await response.allHeaders().catch(() => ({}));
    const contentType = responseHeaders['content-type'] ?? '';
    const isTextual =
      contentType.includes('json') || contentType.includes('graphql');

    let responseBody = null;

    if (isTextual && !contentType.includes('event-stream')) {
      responseBody = await response.text().catch(() => null);
    }

    const requestBody = request.postData();
    const requestContentType = (await request.allHeaders())['content-type'];

    await context.request
      .post(COLLECTOR_URL, {
        data: {
          capturedAt: new Date().toISOString(),
          method: request.method(),
          url: request.url(),
          requestHeaders: await request.allHeaders(),
          requestBody:
            requestContentType?.includes('json') ||
            requestContentType?.includes('graphql')
              ? requestBody
              : requestBody
                ? `<${requestContentType ?? 'binary'} ${requestBody.length} bytes>`
                : null,
          status: response.status(),
          responseHeaders,
          responseBody,
        },
      })
      .catch(() => {});
  });

  return 'attached';
}
