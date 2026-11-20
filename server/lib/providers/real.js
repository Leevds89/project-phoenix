export async function diagnose(systemPrompt, userMessage) {
  const endpoint = new URL(process.env.AI_API_URL);
  const normalizedPath = endpoint.pathname.replace(/\/+$/, '');
  if (!normalizedPath.endsWith('/chat/completions')) {
    endpoint.pathname = `${normalizedPath}/chat/completions`;
  }
  endpoint.search = '';
  endpoint.hash = '';

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
      headers: {
        authorization: `Bearer ${process.env.AI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
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
  let payload;
  try {
    payload = await response.json();
  } catch {
    const error = new Error('AI provider returned an unreadable response.');
    error.name = 'ProviderError';
    throw error;
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    const error = new Error('AI provider response did not contain text.');
    error.name = 'ProviderError';
    throw error;
  }
  return content;
}
