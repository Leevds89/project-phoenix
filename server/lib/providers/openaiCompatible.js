import { resolveProviderConfig } from './config.js';
import { buildEndpoint, extractText, postProviderJson } from './http.js';

export async function diagnose(systemPrompt, userMessage) {
  const { apiUrl, apiKey, model } = resolveProviderConfig();
  const payload = await postProviderJson(buildEndpoint(apiUrl, 'chat/completions'), apiKey ? { authorization: `Bearer ${apiKey}` } : {}, {
    model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
  });
  return extractText(payload?.choices?.[0]?.message?.content, 'AI provider response did not contain text.');
}
