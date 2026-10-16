import { Router } from 'express';

export function createHealthRouter() {
  const router = Router();

  // GET /api/v1/health
  router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return router;
}
