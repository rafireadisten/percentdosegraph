import app from './app.js';
import logger from './lib/logger.js';
import { ensurePersistenceReady } from './lib/persistence.js';

import 'dotenv/config';

const port = Number(process.env.PORT ?? 3001);

try {
  const persistence = await ensurePersistenceReady();

  app.listen(port, () => {
    logger.info({ port, persistence }, 'API server listening');
  });
} catch (error) {
  logger.error({ error }, 'API server failed to initialize persistence');
  process.exit(1);
}
