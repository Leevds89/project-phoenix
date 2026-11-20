import { resolveProviderConfig } from './config.js';
import { buildEndpoint, extractText, postProviderJson } from './http.js';

export async function diagnose(systemPrompt, userMessage) {
  const { apiUrl, model } = resolveProviderConfig();
  const payload = await postProviderJson(buildEndpoint(apiUrl, 'api/chat'), {}, {
    model, stream: false, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
  });
  return extractText(payload?.message?.content, 'Ollama response did not contain text.');
}
