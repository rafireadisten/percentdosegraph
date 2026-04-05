import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
export * from './schema/index.js';
import * as schema from './schema/index.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const db = drizzle(pool, { schema });

export { db, pool };
