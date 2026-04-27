import logger from '../lib/logger.js';
import { ensurePersistenceReady } from '../lib/persistence.js';

async function main() {
  const status = await ensurePersistenceReady();
  logger.info(status, 'Persistence initialization complete');
}

main().catch(error => {
  logger.error({ error }, 'Persistence initialization failed');
  process.exitCode = 1;
});
