const defaults = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://127.0.0.1:11434',
};
const names = { mock: 'Mock demo', openai: 'OpenAI', 'openai-compatible': 'OpenAI-compatible provider', anthropic: 'Anthropic Claude', gemini: 'Google Gemini', ollama: 'Ollama local model' };

export function resolveProviderConfig(env = process.env) {
  const requestedProvider = (env.AI_PROVIDER || 'mock').trim().toLowerCase();
  const provider = requestedProvider === 'real' ? 'openai-compatible' : requestedProvider;
  return {
    requestedProvider,
    provider,
    providerName: names[provider] || 'Unknown provider',
    model: (env.AI_MODEL || '').trim(),
    apiKey: env.AI_API_KEY || '',
    apiUrl: (env.AI_API_URL || defaults[provider] || '').trim(),
    adapterMode: provider === 'mock' ? 'mock' : 'real',
  };
}

export const supportedProviderIds = Object.keys(names);
