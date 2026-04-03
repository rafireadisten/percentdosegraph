import {
  date,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { drugsTable } from "./drugs.js";

export const dosesTable = pgTable("doses", {
  id: serial("id").primaryKey(),
  drugId: integer("drug_id").references(() => drugsTable.id, { onDelete: "set null" }),
  date: date("date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  route: varchar("route", { length: 32 }).notNull(),
  amount: doublePrecision("amount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
