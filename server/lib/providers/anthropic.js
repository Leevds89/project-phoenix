import { resolveProviderConfig } from './config.js';
import { buildEndpoint, extractText, postProviderJson } from './http.js';

export async function diagnose(systemPrompt, userMessage) {
  const { apiUrl, apiKey, model } = resolveProviderConfig();
  const payload = await postProviderJson(buildEndpoint(apiUrl, 'v1/messages'), { 'x-api-key': apiKey, 'anthropic-version': process.env.ANTHROPIC_VERSION || '2023-06-01' }, {
    model, max_tokens: 2048, system: systemPrompt, messages: [{ role: 'user', content: userMessage }],
  });
  const text = Array.isArray(payload?.content) ? payload.content.filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('\n') : '';
  return extractText(text, 'Anthropic response did not contain text.');
}
