import { resolveProviderConfig, supportedProviderIds } from './providers/config.js';

const keyRequiredProviders = new Set(['openai', 'anthropic', 'gemini']);
const localHosts = new Set(['127.0.0.1', 'localhost']);

export function validateRealModeConfig(env) {
  const config = resolveProviderConfig(env);
  const errors = [];
  if (!supportedProviderIds.includes(config.provider) || config.provider === 'mock') {
    errors.push(`AI_PROVIDER must be one of: ${supportedProviderIds.filter((id) => id !== 'mock').join(', ')}.`);
    return errors;
  }
  if (!config.model) errors.push('AI_MODEL is not set');
  if (keyRequiredProviders.has(config.provider) && !config.apiKey.trim()) errors.push(`AI_API_KEY is required for ${config.provider}`);
  if (config.provider === 'openai-compatible' && !config.apiUrl) errors.push('AI_API_URL is required for openai-compatible providers');
  if (!config.apiUrl) {
    errors.push(`No default AI_API_URL is available for ${config.provider}`);
    return errors;
  }
  try {
    const apiUrl = new URL(config.apiUrl);
    if (!['http:', 'https:'].includes(apiUrl.protocol)) errors.push('AI_API_URL must use https: for remote endpoints');
    else if (apiUrl.protocol === 'http:' && !localHosts.has(apiUrl.hostname)) errors.push('AI_API_URL must use https: for non-loopback endpoints');
    if (apiUrl.username || apiUrl.password) errors.push('AI_API_URL must not contain embedded credentials; use AI_API_KEY instead');
    if (config.provider === 'ollama' && !localHosts.has(apiUrl.hostname)) errors.push('The Ollama connector is limited to localhost or 127.0.0.1 in this version');
    if (config.provider === 'openai-compatible' && !localHosts.has(apiUrl.hostname) && !config.apiKey.trim()) errors.push('AI_API_KEY is required for remote openai-compatible providers');
  } catch {
    errors.push('AI_API_URL must be a valid URL');
  }
  return errors;
}
