import { Router } from 'express';
import { getPersistenceMode } from '../lib/persistence.js';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get system health status
 *     description: Returns the current health status of the API server including persistence mode
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 persistence:
 *                   type: object
 *                   properties:
 *                     mode:
 *                       type: string
 *                       enum: [file, database]
 *                       example: file
 *                     seededOnBoot:
 *                       type: boolean
 *                       example: true
 */
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    persistence: {
      mode: getPersistenceMode(),
      seededOnBoot: process.env.PERSISTENCE_SEED_ON_BOOT !== 'false',
    },
  });
});

export default router;
