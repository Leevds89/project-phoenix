export function createOriginCheck({ port = 3001, clientPort = 5173 } = {}) {
  const allowedOrigins = new Set([
    `http://localhost:${clientPort}`,
    `http://127.0.0.1:${clientPort}`,
  ]);
  const allowedHosts = new Set([
    `localhost:${port}`,
    `127.0.0.1:${port}`,
  ]);

  return function originCheck(req, res, next) {
    const origin = req.get('Origin');
    const host = req.get('Host');
    if (origin !== undefined) {
      if (allowedOrigins.has(origin)) return next();
      return res.status(403).json({ error: 'This local request was not allowed.' });
    }
    if (host !== undefined && allowedHosts.has(host)) return next();
    return res.status(403).json({ error: 'This local request was not allowed.' });
  };
}
