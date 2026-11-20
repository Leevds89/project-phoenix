export function buildEndpoint(baseUrl, suffix) {
  const url = new URL(baseUrl);
  const current = url.pathname.replace(/\/+$/, '');
  const normalizedSuffix = suffix.replace(/^\/+/, '');
  if (current !== normalizedSuffix && !current.endsWith(`/${normalizedSuffix}`)) {
    const suffixParts = normalizedSuffix.split('/');
    if (current.endsWith(`/${suffixParts[0]}`)) suffixParts.shift();
    url.pathname = `${current}/${suffixParts.join('/')}`;
  }
  url.search = '';
  url.hash = '';
  return url;
}

export async function postProviderJson(url, headers, body) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12_000),
      headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
    });
  } catch (error) {
    const wrapped = new Error(error?.name === 'TimeoutError' ? 'AI provider request timed out.' : 'AI provider request failed.');
    wrapped.name = 'ProviderError';
    throw wrapped;
  }
  if (!response.ok) {
    const error = new Error(`AI provider returned HTTP ${response.status}.`);
    error.name = 'ProviderError';
    throw error;
  }
  try { return await response.json(); }
  catch {
    const error = new Error('AI provider returned an unreadable response.');
    error.name = 'ProviderError';
    throw error;
  }
}

export function extractText(value, message) {
  if (typeof value !== 'string' || value.length === 0) {
    const error = new Error(message);
    error.name = 'ProviderError';
    throw error;
  }
  return value;
}
