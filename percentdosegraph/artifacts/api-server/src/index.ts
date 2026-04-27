import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '../.env') });

const [{ default: app }, { default: logger }, { ensurePersistenceReady }] = await Promise.all([
  import('./app.js'),
  import('./lib/logger.js'),
  import('./lib/persistence.js'),
]);

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
