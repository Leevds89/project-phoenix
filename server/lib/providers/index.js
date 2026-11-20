import * as mock from './mock.js';
import * as openai from './openaiCompatible.js';
import * as anthropic from './anthropic.js';
import * as gemini from './gemini.js';
import * as ollama from './ollama.js';
import { resolveProviderConfig } from './config.js';

const config = resolveProviderConfig();
const adapters = { mock, openai, 'openai-compatible': openai, anthropic, gemini, ollama };
export const provider = config.requestedProvider === 'real'
  ? adapters['openai-compatible']
  : adapters[config.provider] || mock;
