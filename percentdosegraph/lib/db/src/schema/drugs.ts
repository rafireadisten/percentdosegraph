import { doublePrecision, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const drugsTable = pgTable('drugs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  genericName: varchar('generic_name', { length: 255 }),
  drugClass: varchar('drug_class', { length: 255 }),
  maxDailyDose: doublePrecision('max_daily_dose'),
  maxSingleDose: doublePrecision('max_single_dose'),
  unit: varchar('unit', { length: 64 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
