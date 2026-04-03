import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../../");
const dataDir = path.join(rootDir, "data");

const filePaths = {
  drugs: path.join(dataDir, "drugs.json"),
  doses: path.join(dataDir, "doses.json"),
  profiles: path.join(rootDir, "profiles.json"),
} as const;

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
  name: string;
  payload: ProfilePayload;
  createdAt: string;
  updatedAt: string;
};

type EntityMap = {
  drugs: DrugRecord;
  doses: DoseRecord;
  profiles: ProfileRecord;
};

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function readCollection<K extends keyof EntityMap>(key: K): Promise<EntityMap[K][]> {
  const filePath = filePaths[key];
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as EntityMap[K][];
  return parsed.map((entry, index) => normalizeRecord(key, entry, index));
}

async function writeCollection<K extends keyof EntityMap>(key: K, entries: EntityMap[K][]) {
  const filePath = filePaths[key];
  await fs.writeFile(filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

function normalizeRecord<K extends keyof EntityMap>(key: K, entry: EntityMap[K], index: number) {
  if (key === "profiles") {
    const profile = entry as ProfileRecord;
    return {
      id: Number(profile.id ?? index + 1),
      name: profile.name,
      payload: profile.payload ?? {},
      createdAt: profile.createdAt ?? new Date().toISOString(),
      updatedAt: profile.updatedAt ?? profile.createdAt ?? new Date().toISOString(),
    } as EntityMap[K];
  }

  if (key === "doses") {
    const dose = entry as DoseRecord;
    return {
      id: Number(dose.id ?? index + 1),
      drugId: dose.drugId,
      date: dose.date,
      endDate: dose.endDate,
      route: dose.route,
      amount: Number(dose.amount),
      notes: dose.notes ?? "",
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
    notes: drug.notes ?? "",
  } as EntityMap[K];
}

function nextId(entries: Array<{ id: number }>) {
  return entries.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
}

async function dbModule() {
  return import("@workspace/db");
}

export async function listDrugs() {
  if (hasDatabase) {
    const { db, drugsTable } = await dbModule();
    return db.select().from(drugsTable).orderBy(drugsTable.name);
  }

  const drugs = await readCollection("drugs");
  return drugs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createDrug(input: Omit<DrugRecord, "id">) {
  if (hasDatabase) {
    const { db, drugsTable } = await dbModule();
    const [drug] = await db.insert(drugsTable).values(input).returning();
    return drug;
  }

  const drugs = await readCollection("drugs");
  const drug = { id: nextId(drugs), ...input };
  drugs.push(drug);
  await writeCollection("drugs", drugs);
  return drug;
}

export async function getDrugById(id: number) {
  if (hasDatabase) {
    const { db, drugsTable } = await dbModule();
    const { eq } = await import("drizzle-orm");
    const [drug] = await db.select().from(drugsTable).where(eq(drugsTable.id, id));
    return drug ?? null;
  }

  const drugs = await readCollection("drugs");
  return drugs.find((drug) => drug.id === id) ?? null;
}

export async function deleteDrugById(id: number) {
  if (hasDatabase) {
    const { db, drugsTable } = await dbModule();
    const { eq } = await import("drizzle-orm");
    const [drug] = await db.delete(drugsTable).where(eq(drugsTable.id, id)).returning();
    return drug ?? null;
  }

  const drugs = await readCollection("drugs");
  const index = drugs.findIndex((drug) => drug.id === id);
  if (index === -1) {
    return null;
  }
  const [drug] = drugs.splice(index, 1);
  await writeCollection("drugs", drugs);
  return drug;
}

export async function listDoses() {
  if (hasDatabase) {
    const { db, dosesTable } = await dbModule();
    return db.select().from(dosesTable).orderBy(dosesTable.date);
  }

  const doses = await readCollection("doses");
  return doses.sort((a, b) => a.date.localeCompare(b.date));
}

export async function createDose(input: Omit<DoseRecord, "id">) {
  if (hasDatabase) {
    const { db, dosesTable } = await dbModule();
    const [dose] = await db.insert(dosesTable).values(input).returning();
    return dose;
  }

  const doses = await readCollection("doses");
  const dose = { id: nextId(doses), ...input };
  doses.push(dose);
  await writeCollection("doses", doses);
  return dose;
}

export async function deleteDoseById(id: number) {
  if (hasDatabase) {
    const { db, dosesTable } = await dbModule();
    const { eq } = await import("drizzle-orm");
    const [dose] = await db.delete(dosesTable).where(eq(dosesTable.id, id)).returning();
    return dose ?? null;
  }

  const doses = await readCollection("doses");
  const index = doses.findIndex((dose) => dose.id === id);
  if (index === -1) {
    return null;
  }
  const [dose] = doses.splice(index, 1);
  await writeCollection("doses", doses);
  return dose;
}

export async function listProfiles() {
  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    return db.select().from(profilesTable).orderBy(profilesTable.name);
  }

  const profiles = await readCollection("profiles");
  return profiles.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createProfile(input: Omit<ProfileRecord, "id" | "createdAt" | "updatedAt">) {
  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    const [profile] = await db.insert(profilesTable).values(input).returning();
    return profile;
  }

  const profiles = await readCollection("profiles");
  const timestamp = new Date().toISOString();
  const profile = {
    id: nextId(profiles),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  profiles.push(profile);
  await writeCollection("profiles", profiles);
  return profile;
}

export async function updateProfileById(
  id: number,
  input: Partial<Omit<ProfileRecord, "id" | "createdAt" | "updatedAt">>
) {
  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    const { eq } = await import("drizzle-orm");
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

  const profiles = await readCollection("profiles");
  const index = profiles.findIndex((profile) => profile.id === id);
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
  await writeCollection("profiles", profiles);
  return nextProfile;
}

export async function deleteProfileById(id: number) {
  if (hasDatabase) {
    const { db, profilesTable } = await dbModule();
    const { eq } = await import("drizzle-orm");
    const [profile] = await db.delete(profilesTable).where(eq(profilesTable.id, id)).returning();
    return profile ?? null;
  }

  const profiles = await readCollection("profiles");
  const index = profiles.findIndex((profile) => profile.id === id);
  if (index === -1) {
    return null;
  }
  const [profile] = profiles.splice(index, 1);
  await writeCollection("profiles", profiles);
  return profile;
}
