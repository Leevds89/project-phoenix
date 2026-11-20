import { Router } from 'express';
import { resolveProviderConfig } from '../lib/providers/config.js';

const router = Router();
router.get('/', (_req, res) => {
  const config = resolveProviderConfig();
  res.json({
    adapterMode: config.adapterMode,
    providerLabel: config.adapterMode === 'real' ? new URL(config.apiUrl).hostname : null,
    providerId: config.adapterMode === 'real' ? config.provider : null,
    providerName: config.adapterMode === 'real' ? config.providerName : null,
    modelName: config.adapterMode === 'real' ? config.model : null,
  });
});
export default router;
