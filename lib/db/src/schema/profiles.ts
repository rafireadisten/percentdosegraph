import { integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts.js";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accountsTable.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
