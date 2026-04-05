import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const DEFAULT_ACCOUNT_EMAIL = 'default@percentdosegraph.local';
const DEFAULT_ACCOUNT_NAME = 'Default Workspace Account';

type AccountRecord = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
};

type DrugRecord = {
  id: number;
  name: string;
  genericName?: string;
  drugClass?: string;
  maxDailyDose?: number;
  maxSingleDose?: number;
  unit?: string;
  notes?: string;
};

type DoseRecord = {
  id: number;
  drugId?: number;
  date: string;
  endDate?: string;
  route: string;
  amount: number;
  notes?: string;
};

type ProfilePayload = {
  settings?: Record<string, unknown>;
  doseEvents?: Array<Record<string, unknown>>;
};

type ProfileRecord = {
  id: number;
  accountId: number;
  name: string;
  payload: ProfilePayload;
  createdAt: string;
  updatedAt: string;
};

type EntityMap = {
  accounts: AccountRecord;
  drugs: DrugRecord;
  doses: DoseRecord;
  profiles: ProfileRecord;
};

export type PublicAccount = Omit<AccountRecord, 'passwordHash'>;

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function readCollection<K extends keyof EntityMap>(key: K): Promise<EntityMap[K][]> {
  const filePath = filePaths[key];
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as EntityMap[K][];
  return parsed.map((entry, index) => normalizeRecord(key, entry, index));
}

async function writeCollection<K extends keyof EntityMap>(key: K, entries: EntityMap[K][]) {
  const filePath = filePaths[key];
  await fs.writeFile(filePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

function normalizeRecord<K extends keyof EntityMap>(key: K, entry: EntityMap[K], index: number) {
  if (key === 'accounts') {
    const account = entry as AccountRecord;
    return {
      id: Number(account.id ?? index + 1),
      name: account.name ?? `Account ${index + 1}`,
      email: account.email ?? `account-${index + 1}@percentdosegraph.local`,
      passwordHash: account.passwordHash ?? '',
      role: account.role ?? 'user',
      isActive: account.isActive ?? true,
      createdAt: account.createdAt ?? new Date().toISOString(),
      updatedAt: account.updatedAt ?? account.createdAt ?? new Date().toISOString(),
    } as EntityMap[K];
  }

  if (key === 'profiles') {
    const profile = entry as ProfileRecord;
    return {
      id: Number(profile.id ?? index + 1),
      accountId: Number(profile.accountId ?? 1),
      name: profile.name,
      payload: profile.payload ?? {},
      createdAt: profile.createdAt ?? new Date().toISOString(),
      updatedAt: profile.updatedAt ?? profile.createdAt ?? new Date().toISOString(),
    } as EntityMap[K];
  }

  if (key === 'doses') {
    const dose = entry as DoseRecord;
    return {
      id: Number(dose.id ?? index + 1),
      drugId: dose.drugId,
      date: dose.date,
      endDate: dose.endDate,
      route: dose.route,
      amount: Number(dose.amount),
      notes: dose.notes ?? '',
    } as EntityMap[K];
  }

  const drug = entry as DrugRecord;
  return {
    id: Number(drug.id ?? index + 1),
    name: drug.name,
    genericName: drug.genericName,
    drugClass: drug.drugClass,
    maxDailyDose: drug.maxDailyDose,
    maxSingleDose: drug.maxSingleDose,
    unit: drug.unit,
    notes: drug.notes ?? '',
  } as EntityMap[K];
}

function nextId(entries: Array<{ id: number }>) {
  return entries.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
}

async function dbModule() {
  return import('@workspace/db');
}

export async function listAccounts() {
  if (hasDatabase) {
    const { db, accountsTable } = await dbModule();
    return db.select().from(accountsTable).orderBy(accountsTable.name);
  }

  const accounts = await readCollection('accounts');
  return accounts.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createAccount(input: Omit<AccountRecord, 'id' | 'createdAt' | 'updatedAt'>) {
  if (hasDatabase) {
    const { db, accountsTable } = await dbModule();
    const [account] = await db.insert(accountsTable).values(input).returning();
    return account;
  }

  const accounts = await readCollection('accounts');
  const timestamp = new Date().toISOString();
  const account = {
    id: nextId(accounts),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  accounts.push(account);
  await writeCollection('accounts', accounts);
  return account;
}

export async function getAccountById(id: number) {
  if (hasDatabase) {
    const { db, accountsTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
    return account ?? null;
  }

  const accounts = await readCollection('accounts');
  return accounts.find(account => account.id === id) ?? null;
}

export async function getAccountByEmail(email: string) {
  if (hasDatabase) {
    const { db, accountsTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.email, email));
    return account ?? null;
  }

  const accounts = await readCollection('accounts');
  return accounts.find(account => account.email === email) ?? null;
}

export async function updateAccountById(
  id: number,
  input: Partial<Omit<AccountRecord, 'id' | 'createdAt' | 'updatedAt'>>
) {
  if (hasDatabase) {
    const { db, accountsTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [account] = await db
      .update(accountsTable)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(accountsTable.id, id))
      .returning();
    return account ?? null;
  }

  const accounts = await readCollection('accounts');
  const index = accounts.findIndex(account => account.id === id);
  if (index === -1) {
    return null;
  }

  const nextAccount = {
    ...accounts[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  accounts[index] = normalizeRecord('accounts', nextAccount as EntityMap['accounts'], index);
  await writeCollection('accounts', accounts);
  return accounts[index];
}

export async function deleteAccountById(id: number) {
  if (hasDatabase) {
    const { db, accountsTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [account] = await db.delete(accountsTable).where(eq(accountsTable.id, id)).returning();
    return account ?? null;
  }

  const accounts = await readCollection('accounts');
  const index = accounts.findIndex(account => account.id === id);
  if (index === -1) {
    return null;
  }

  const profiles = await readCollection('profiles');
  const filteredProfiles = profiles.filter(profile => profile.accountId !== id);
  if (filteredProfiles.length !== profiles.length) {
    await writeCollection('profiles', filteredProfiles);
  }

  const [account] = accounts.splice(index, 1);
  await writeCollection('accounts', accounts);
  return account;
}

export async function ensureDefaultAccount() {
  if (hasDatabase) {
    const { db, accountsTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [existing] = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.email, DEFAULT_ACCOUNT_EMAIL));

    if (existing) {
      return existing;
    }

    const [account] = await db
      .insert(accountsTable)
      .values({
        name: DEFAULT_ACCOUNT_NAME,
        email: DEFAULT_ACCOUNT_EMAIL,
        passwordHash: '',
        role: 'system',
        isActive: true,
      })
      .returning();
    return account;
  }

  const accounts = await readCollection('accounts');
  const existing = accounts.find(account => account.email === DEFAULT_ACCOUNT_EMAIL);
  if (existing) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  const account = {
    id: nextId(accounts),
    name: DEFAULT_ACCOUNT_NAME,
    email: DEFAULT_ACCOUNT_EMAIL,
    passwordHash: '',
    role: 'system',
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  accounts.push(account);
  await writeCollection('accounts', accounts);
  return account;
}

export function sanitizeAccount(account: AccountRecord | null) {
  if (!account) {
    return null;
  }

  const { passwordHash, ...publicAccount } = account;
  void passwordHash; // Explicitly ignore unused variable
  return publicAccount;
}

export async function listDrugs() {
  if (hasDatabase) {
    const { db, drugsTable } = await dbModule();
    return db.select().from(drugsTable).orderBy(drugsTable.name);
  }

  const drugs = await readCollection('drugs');
  return drugs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createDrug(input: Omit<DrugRecord, 'id'>) {
  if (hasDatabase) {
    const { db, drugsTable } = await dbModule();
    const [drug] = await db.insert(drugsTable).values(input).returning();
    return drug;
  }

  const drugs = await readCollection('drugs');
  const drug = { id: nextId(drugs), ...input };
  drugs.push(drug);
  await writeCollection('drugs', drugs);
  return drug;
}

export async function getDrugById(id: number) {
  if (hasDatabase) {
    const { db, drugsTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [drug] = await db.select().from(drugsTable).where(eq(drugsTable.id, id));
    return drug ?? null;
  }

  const drugs = await readCollection('drugs');
  return drugs.find(drug => drug.id === id) ?? null;
}

export async function deleteDrugById(id: number) {
  if (hasDatabase) {
    const { db, drugsTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [drug] = await db.delete(drugsTable).where(eq(drugsTable.id, id)).returning();
    return drug ?? null;
  }

  const drugs = await readCollection('drugs');
  const index = drugs.findIndex(drug => drug.id === id);
  if (index === -1) {
    return null;
  }
  const [drug] = drugs.splice(index, 1);
  await writeCollection('drugs', drugs);
  return drug;
}

export async function listDoses() {
  if (hasDatabase) {
    const { db, dosesTable } = await dbModule();
    return db.select().from(dosesTable).orderBy(dosesTable.date);
  }

  const doses = await readCollection('doses');
  return doses.sort((a, b) => a.date.localeCompare(b.date));
}

export async function createDose(input: Omit<DoseRecord, 'id'>) {
  if (hasDatabase) {
    const { db, dosesTable } = await dbModule();
    const [dose] = await db.insert(dosesTable).values(input).returning();
    return dose;
  }

  const doses = await readCollection('doses');
  const dose = { id: nextId(doses), ...input };
  doses.push(dose);
  await writeCollection('doses', doses);
  return dose;
}

export async function deleteDoseById(id: number) {
  if (hasDatabase) {
    const { db, dosesTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [dose] = await db.delete(dosesTable).where(eq(dosesTable.id, id)).returning();
    return dose ?? null;
  }

  const doses = await readCollection('doses');
  const index = doses.findIndex(dose => dose.id === id);
  if (index === -1) {
    return null;
  }
  const [dose] = doses.splice(index, 1);
  await writeCollection('doses', doses);
  return dose;
}

export async function updateDoseById(id: number, input: Partial<Omit<DoseRecord, 'id'>>) {
  if (hasDatabase) {
    const { db, dosesTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [dose] = await db.update(dosesTable).set(input).where(eq(dosesTable.id, id)).returning();
    return dose ?? null;
  }

  const doses = await readCollection('doses');
  const index = doses.findIndex(dose => dose.id === id);
  if (index === -1) {
    return null;
  }

  const current = doses[index];
  const nextDose = {
    ...current,
    ...input,
  };
  doses[index] = normalizeRecord('doses', nextDose as EntityMap['doses'], index);
  await writeCollection('doses', doses);
  return doses[index];
}

export async function listProfiles(accountId?: number) {
  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    if (accountId) {
      return db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.accountId, accountId))
        .orderBy(profilesTable.name);
    }
    return db.select().from(profilesTable).orderBy(profilesTable.name);
  }

  const profiles = await readCollection('profiles');
  return profiles
    .filter(profile => (accountId ? profile.accountId === accountId : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProfileById(id: number) {
  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, id));
    return profile ?? null;
  }

  const profiles = await readCollection('profiles');
  return profiles.find(profile => profile.id === id) ?? null;
}

export async function createProfile(
  input: Omit<ProfileRecord, 'id' | 'createdAt' | 'updatedAt' | 'accountId'> & {
    accountId?: number;
  }
) {
  const accountId = input.accountId ?? (await ensureDefaultAccount()).id;

  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    const [profile] = await db
      .insert(profilesTable)
      .values({ ...input, accountId })
      .returning();
    return profile;
  }

  const profiles = await readCollection('profiles');
  const timestamp = new Date().toISOString();
  const profile = {
    id: nextId(profiles),
    ...input,
    accountId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  profiles.push(profile);
  await writeCollection('profiles', profiles);
  return profile;
}

export async function updateProfileById(
  id: number,
  input: Partial<Omit<ProfileRecord, 'id' | 'createdAt' | 'updatedAt'>>
) {
  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [profile] = await db
      .update(profilesTable)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(profilesTable.id, id))
      .returning();
    return profile ?? null;
  }

  const profiles = await readCollection('profiles');
  const index = profiles.findIndex(profile => profile.id === id);
  if (index === -1) {
    return null;
  }

  const current = profiles[index];
  const nextProfile = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  profiles[index] = nextProfile;
  await writeCollection('profiles', profiles);
  return nextProfile;
}

export async function deleteProfileById(id: number) {
  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    const { eq } = await import('drizzle-orm');
    const [profile] = await db.delete(profilesTable).where(eq(profilesTable.id, id)).returning();
    return profile ?? null;
  }

  const profiles = await readCollection('profiles');
  const index = profiles.findIndex(profile => profile.id === id);
  if (index === -1) {
    return null;
  }
  const [profile] = profiles.splice(index, 1);
  await writeCollection('profiles', profiles);
  return profile;
}
