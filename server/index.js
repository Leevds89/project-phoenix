import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createOriginCheck } from './middleware/originCheck.js';
import configRouter from './routes/config.js';
import diagnoseRouter from './routes/diagnose.js';
import { validateRealModeConfig } from './lib/validateRealModeConfig.js';
import { resolveProviderConfig, supportedProviderIds } from './lib/providers/config.js';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDir, '../.env') });

const providerConfig = resolveProviderConfig(process.env);
if (!supportedProviderIds.includes(providerConfig.provider)) {
  console.error(`Phoenix startup error: AI_PROVIDER must be one of: ${supportedProviderIds.join(', ')}.`);
  process.exit(1);
}
if (providerConfig.provider !== 'mock') {
  const errors = validateRealModeConfig(process.env);
  if (errors.length > 0) {
    console.error(`Phoenix startup error — provider is misconfigured:\n${errors.map((error) => `  - ${error}`).join('\n')}\nCheck the provider setup in .env or switch AI_PROVIDER to 'mock'.`);
    process.exit(1);
  }
}

const port = Number.parseInt(process.env.PORT || '3001', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Phoenix startup error: PORT must be an integer between 1 and 65535.');
  process.exit(1);
}
const clientPort = Number.parseInt(process.env.CLIENT_PORT || '5173', 10);
if (!Number.isInteger(clientPort) || clientPort < 1 || clientPort > 65535) {
  console.error('Phoenix startup error: CLIENT_PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestPath = req.path;
  res.on('finish', () => console.log(`${req.method} ${requestPath} ${res.statusCode} ${Date.now() - startedAt}ms`));
  next();
});
app.use('/api', createOriginCheck({ port, clientPort }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/config', configRouter);
app.use('/api/diagnose', diagnoseRouter);
app.use((_req, res) => res.status(404).json({ error: 'The requested page was not found.' }));
app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'That request is too large. Please shorten the pasted text and try again.' });
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'The request could not be read. Please try again.' });
  return res.status(500).json({ error: 'Something went wrong on the local server. Please try again.' });
});
app.listen(port, '127.0.0.1', () => {
  console.log(`Phoenix server ready at http://127.0.0.1:${port} (${providerConfig.providerName})`);
});
