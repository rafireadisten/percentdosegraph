import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');
const dataDir = path.join(rootDir, 'data');

const filePaths = {
  accounts: path.join(rootDir, 'accounts.json'),
  drugs: path.join(dataDir, 'drugs.json'),
  doses: path.join(dataDir, 'doses.json'),
  profiles: path.join(rootDir, 'profiles.json'),
} as const;

export function getPersistenceMode() {
  return process.env.DATABASE_URL ? 'database' : 'file';
}

export async function ensurePersistenceReady() {
  if (getPersistenceMode() !== 'database') {
    logger.info('Persistence mode: file-backed JSON');
    return {
      mode: 'file',
      seeded: false,
    } as const;
  }

  const { pool } = await import('@workspace/db');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL DEFAULT '',
      role VARCHAR(64) NOT NULL DEFAULT 'user',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT ''
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS drugs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      generic_name VARCHAR(255),
      drug_class VARCHAR(255),
      max_daily_dose DOUBLE PRECISION,
      max_single_dose DOUBLE PRECISION,
      unit VARCHAR(64),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS account_id INTEGER
  `);

  await pool.query(`
    INSERT INTO accounts (name, email, role, is_active)
    VALUES ('Default Workspace Account', 'default@percentdosegraph.local', 'system', TRUE)
    ON CONFLICT (email) DO NOTHING
  `);

  await pool.query(`
    UPDATE profiles
    SET account_id = (
      SELECT id FROM accounts WHERE email = 'default@percentdosegraph.local' LIMIT 1
    )
    WHERE account_id IS NULL
  `);

  await pool.query(`
    ALTER TABLE profiles
    ALTER COLUMN account_id SET NOT NULL
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_account_id_accounts_id_fk'
      ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_account_id_accounts_id_fk
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS doses (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      end_date DATE,
      route VARCHAR(32) NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const shouldSeed = process.env.PERSISTENCE_SEED_ON_BOOT !== 'false';
  const seeded = shouldSeed ? await seedDatabaseFromFilesIfEmpty() : false;

  logger.info({ seeded }, 'Persistence mode: database');

  return {
    mode: 'database',
    seeded,
  } as const;
}

async function seedDatabaseFromFilesIfEmpty() {
  const { pool } = await import('@workspace/db');

  const [accountsCount, drugsCount, dosesCount, profilesCount] = await Promise.all([
    countRows(pool, 'accounts'),
    countRows(pool, 'drugs'),
    countRows(pool, 'doses'),
    countRows(pool, 'profiles'),
  ]);

  if (accountsCount > 1 || drugsCount > 0 || dosesCount > 0 || profilesCount > 0) {
    return false;
  }

  const [accounts, drugs, doses, profiles] = await Promise.all([
    readJsonFile(filePaths.accounts),
    readJsonFile(filePaths.drugs),
    readJsonFile(filePaths.doses),
    readJsonFile(filePaths.profiles),
  ]);

  await pool.query('BEGIN');

  try {
    const accountIdByLegacyId = new Map<number, number>();

    for (const account of accounts) {
      const result = await pool.query(
        `
          INSERT INTO accounts
            (name, email, password_hash, role, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email) DO UPDATE
            SET name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active,
                updated_at = EXCLUDED.updated_at
          RETURNING id
        `,
        [
          account.name,
          account.email,
          account.passwordHash ?? '',
          account.role ?? 'user',
          account.isActive ?? true,
          account.createdAt ?? new Date().toISOString(),
          account.updatedAt ?? account.createdAt ?? new Date().toISOString(),
        ]
      );
      if (account.id) {
        accountIdByLegacyId.set(Number(account.id), Number(result.rows[0]?.id));
      }
    }

    for (const drug of drugs) {
      await pool.query(
        `
          INSERT INTO drugs
            (name, generic_name, drug_class, max_daily_dose, max_single_dose, unit, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          drug.name,
          drug.genericName ?? null,
          drug.drugClass ?? null,
          drug.maxDailyDose ?? null,
          drug.maxSingleDose ?? null,
          drug.unit ?? null,
          drug.notes ?? null,
        ]
      );
    }

    for (const dose of doses) {
      await pool.query(
        `
          INSERT INTO doses
            (drug_id, date, end_date, route, amount, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          dose.drugId ?? null,
          dose.date,
          dose.endDate ?? null,
          dose.route,
          dose.amount,
          dose.notes ?? null,
        ]
      );
    }

    const defaultAccountResult = await pool.query(
      `SELECT id FROM accounts WHERE email = 'default@percentdosegraph.local' LIMIT 1`
    );
    const defaultAccountId = Number(defaultAccountResult.rows[0]?.id);

    for (const profile of profiles) {
      const resolvedAccountId =
        accountIdByLegacyId.get(Number(profile.accountId)) || defaultAccountId;
      await pool.query(
        `
          INSERT INTO profiles
            (account_id, name, payload, created_at, updated_at)
          VALUES ($1, $2, $3::jsonb, $4, $5)
        `,
        [
          resolvedAccountId,
          profile.name ?? profile.label ?? `Profile ${profile.id ?? ''}`.trim(),
          JSON.stringify(profile.payload ?? {}),
          profile.createdAt ?? new Date().toISOString(),
          profile.updatedAt ?? profile.createdAt ?? new Date().toISOString(),
        ]
      );
    }

    await pool.query('COMMIT');
    logger.info(
      {
        accounts: accounts.length,
        drugs: drugs.length,
        doses: doses.length,
        profiles: profiles.length,
      },
      'Seeded database persistence from JSON files'
    );
    return true;
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

async function countRows(
  pool: { query: (sql: string) => Promise<{ rows: Array<{ count: string }> }> },
  tableName: string
) {
  const result = await pool.query(`SELECT COUNT(*)::text AS count FROM ${tableName}`);
  return Number(result.rows[0]?.count ?? '0');
}

async function readJsonFile(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.warn({ filePath, error }, 'Failed to read seed file, continuing with empty dataset');
    return [];
  }
}
