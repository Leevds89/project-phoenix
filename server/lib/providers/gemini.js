import { resolveProviderConfig } from './config.js';
import { buildEndpoint, extractText, postProviderJson } from './http.js';

export async function diagnose(systemPrompt, userMessage) {
  const { apiUrl, apiKey, model } = resolveProviderConfig();
  const modelId = encodeURIComponent(model.replace(/^models\//, ''));
  const payload = await postProviderJson(buildEndpoint(apiUrl, `models/${modelId}:generateContent`), { 'x-goog-api-key': apiKey }, {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  });
  const text = payload?.candidates?.[0]?.content?.parts?.filter((part) => typeof part?.text === 'string').map((part) => part.text).join('\n') || '';
  return extractText(text, 'Gemini response did not contain text.');
}
