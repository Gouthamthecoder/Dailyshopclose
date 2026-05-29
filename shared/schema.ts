import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, date, jsonb, boolean, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const shopIdSchema = z
  .string()
  .trim()
  .min(1, "Shop ID is required")
  .transform((value) => value.toLowerCase());

export const users = pgTable(
  "users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    shopId: text("shop_id").notNull(),
    username: text("username").notNull(),
    password: text("password").notNull(),
    role: text("role").notNull().default("user"),
  },
  (table) => ({
    shopUsernameUniqueIdx: uniqueIndex("users_shop_username_unique").on(table.shopId, table.username),
  }),
);

export const insertUserSchema = createInsertSchema(users).pick({
  shopId: true,
  username: true,
  password: true,
});

export const loginSchema = z.object({
  shopId: shopIdSchema,
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  shopId: shopIdSchema,
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

export const createShopSchema = z.object({
  shopId: shopIdSchema,
  shopName: z.string().trim().min(1, "Shop name is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const shopSettings = pgTable(
  "shop_settings",
  {
    id: serial("id").primaryKey(),
    shopId: text("shop_id").notNull().unique(),
    shopName: text("shop_name").notNull().default("My Shop"),
    whatsappGroupLink: text("whatsapp_group_link"),
    customFields: jsonb("custom_fields").$type<CustomFieldDef[]>().default([]),
  },
);

export interface CustomFieldDef {
  id: string;
  label: string;
  type: "number" | "text";
  section: "opening" | "closing";
  enabled: boolean;
}

export const insertShopSettingsSchema = createInsertSchema(shopSettings).omit({ id: true });
export type InsertShopSettings = z.infer<typeof insertShopSettingsSchema>;
export type ShopSettings = typeof shopSettings.$inferSelect;

export const dailyClosings = pgTable(
  "daily_closings",
  {
    id: serial("id").primaryKey(),
    shopId: text("shop_id").notNull(),
    date: date("date").notNull(),
    previousCashBalance: real("previous_cash_balance").notNull().default(0),
    currentCashBalance: real("current_cash_balance").notNull().default(0),
    totalExpenses: real("total_expenses").notNull().default(0),
    expenseNotes: text("expense_notes"),
    salesCash: real("sales_cash").notNull().default(0),
    salesUpi: real("sales_upi").notNull().default(0),
    salesCard: real("sales_card").notNull().default(0),
    totalCustomerVisits: integer("total_customer_visits").notNull().default(0),
    stockNotes: text("stock_notes"),
    electricityMeterReading: real("electricity_meter_reading"),
    customFieldValues: jsonb("custom_field_values").$type<Record<string, string | number>>().default({}),
    notes: text("notes"),
    status: text("status").notNull().default("draft"),
    sentToWhatsapp: boolean("sent_to_whatsapp").notNull().default(false),
  },
  (table) => ({
    shopDateUniqueIdx: uniqueIndex("daily_closings_shop_date_unique").on(table.shopId, table.date),
  }),
);

export const insertDailyClosingSchema = createInsertSchema(dailyClosings).omit({ id: true });
export type InsertDailyClosing = z.infer<typeof insertDailyClosingSchema>;
export type DailyClosing = typeof dailyClosings.$inferSelect;
