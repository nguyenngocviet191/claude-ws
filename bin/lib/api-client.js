const fs = require('fs');
const path = require('path');

class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = details.status;
    this.payload = details.payload;
  }
}

function resolveBaseUrl(overrideBaseUrl) {
  if (overrideBaseUrl) {
    return overrideBaseUrl;
  }

  if (process.env.AGENTIC_SDK_BASE_URL) {
    return process.env.AGENTIC_SDK_BASE_URL;
  }

  if (process.env.CLAUDE_WS_API_BASE_URL) {
    return process.env.CLAUDE_WS_API_BASE_URL;
  }

  const host = process.env.AGENTIC_SDK_HOST || 'localhost';
  const port = process.env.AGENTIC_SDK_PORT || '3100';
  return `http://${host}:${port}`;
}

function buildUrl(baseUrl, routePath, query = {}) {
  const url = new URL(routePath, resolveBaseUrl(baseUrl));

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url;
}

function buildHeaders(apiKey, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const resolvedApiKey = apiKey || process.env.API_ACCESS_KEY;

  if (resolvedApiKey) {
    headers['x-api-key'] = resolvedApiKey;
  }

  return headers;
}

async function parseResponseBody(response, responseType) {
  if (responseType === 'arrayBuffer') {
    return response.arrayBuffer();
  }

  if (responseType === 'text') {
    return response.text();
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function request(options) {
  const {
    method = 'GET',
    path: routePath,
    query,
    body,
    headers,
    apiKey,
    baseUrl,
    timeoutMs = 30000,
    responseType = 'auto',
  } = options;

  const url = buildUrl(baseUrl, routePath, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders = buildHeaders(apiKey, headers);
  const fetchOptions = {
    method,
    headers: requestHeaders,
    signal: controller.signal,
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      fetchOptions.body = body;
      delete requestHeaders['content-type'];
    } else if (typeof body === 'string' || body instanceof Uint8Array) {
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
      requestHeaders['content-type'] = requestHeaders['content-type'] || 'application/json';
    }
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new ApiError(`Request timeout after ${timeoutMs}ms`);
    }
    throw new ApiError(error.message);
  }

  clearTimeout(timeout);

  const parsedBody = await parseResponseBody(response, responseType);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (parsedBody && typeof parsedBody === 'object') {
      message = parsedBody.message || parsedBody.error || message;
    } else if (typeof parsedBody === 'string' && parsedBody.trim()) {
      message = parsedBody;
    }

    throw new ApiError(message, {
      status: response.status,
      payload: parsedBody,
    });
  }

  return parsedBody;
}

async function streamSse(options) {
  const {
    path: routePath,
    query,
    headers,
    apiKey,
    baseUrl,
    timeoutMs = 0,
    onEvent,
  } = options;

  const url = buildUrl(baseUrl, routePath, query);
  const controller = new AbortController();
  let timeout = null;

  if (timeoutMs > 0) {
    timeout = setTimeout(() => controller.abort(), timeoutMs);
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(apiKey, headers),
      signal: controller.signal,
    });
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    throw new ApiError(error.message);
  }

  if (!response.ok) {
    if (timeout) clearTimeout(timeout);
    const payload = await parseResponseBody(response, 'auto');
    throw new ApiError(`SSE request failed with status ${response.status}`, {
      status: response.status,
      payload,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const emitChunk = async (chunk) => {
    let event = 'message';
    const dataLines = [];

    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) {
      return false;
    }

    const rawData = dataLines.join('\n');
    let data = rawData;
    try {
      data = JSON.parse(rawData);
    } catch {
      // Keep raw string when payload is not JSON.
    }

    if (onEvent) {
      await onEvent({ event, data, rawData });
    }

    return event === 'done';
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const shouldStop = await emitChunk(part);
        if (shouldStop) {
          if (timeout) clearTimeout(timeout);
          return;
        }
      }
    }

    if (buffer.trim()) {
      await emitChunk(buffer);
    }
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function createUploadForm(filePath, fields = {}) {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      form.set(key, String(value));
    }
  }

  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath);
  form.set('file', new Blob([content]), path.basename(absolutePath));

  return form;
}

module.exports = {
  ApiError,
  resolveBaseUrl,
  request,
  streamSse,
  createUploadForm,
};
