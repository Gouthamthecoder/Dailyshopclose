import { randomUUID } from "crypto";
import { eq, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  type User, type InsertUser,
  type ShopSettings, type InsertShopSettings,
  type DailyClosing, type InsertDailyClosing, type CustomFieldDef,
  users, shopSettings, dailyClosings,
} from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;
const hasDatabase = Boolean(databaseUrl);

const pool = hasDatabase
  ? new pg.Pool({
      connectionString: databaseUrl,
    })
  : null;

export const db = pool ? drizzle(pool) : null;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;

  getSettings(): Promise<ShopSettings>;
  updateSettings(data: Partial<InsertShopSettings>): Promise<ShopSettings>;

  getClosingByDate(date: string): Promise<DailyClosing | undefined>;
  getClosingsByDateRange(from: string, to: string): Promise<DailyClosing[]>;
  createClosing(data: InsertDailyClosing): Promise<DailyClosing>;
  updateClosing(id: number, data: Partial<InsertDailyClosing>): Promise<DailyClosing>;
  getAllClosings(): Promise<DailyClosing[]>;
}

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getSettings(): Promise<ShopSettings> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [existing] = await db.select().from(shopSettings);
    if (existing) return existing;
    const [created] = await db.insert(shopSettings).values({ shopName: "My Shop" }).returning();
    return created;
  }

  async updateSettings(data: Partial<InsertShopSettings>): Promise<ShopSettings> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const current = await this.getSettings();
    const [updated] = await db
      .update(shopSettings)
      .set(data as any)
      .where(eq(shopSettings.id, current.id))
      .returning();
    return updated;
  }

  async getClosingByDate(date: string): Promise<DailyClosing | undefined> {
    if (!db) return undefined;
    const [closing] = await db.select().from(dailyClosings).where(eq(dailyClosings.date, date));
    return closing;
  }

  async getClosingsByDateRange(from: string, to: string): Promise<DailyClosing[]> {
    if (!db) return [];
    return db
      .select()
      .from(dailyClosings)
      .where(and(gte(dailyClosings.date, from), lte(dailyClosings.date, to)))
      .orderBy(dailyClosings.date);
  }

  async createClosing(data: InsertDailyClosing): Promise<DailyClosing> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [closing] = await db.insert(dailyClosings).values(data).returning();
    return closing;
  }

  async updateClosing(id: number, data: Partial<InsertDailyClosing>): Promise<DailyClosing> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [closing] = await db
      .update(dailyClosings)
      .set(data)
      .where(eq(dailyClosings.id, id))
      .returning();
    return closing;
  }

  async getAllClosings(): Promise<DailyClosing[]> {
    if (!db) return [];
    return db.select().from(dailyClosings).orderBy(dailyClosings.date);
  }
}

class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private settings: ShopSettings | null = null;
  private closings = new Map<number, DailyClosing>();
  private nextClosingId = 1;

  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    return user ? cloneRecord(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find((entry) => entry.username === username);
    return user ? cloneRecord(user) : undefined;
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const user: User = {
      id: randomUUID(),
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role ?? "user",
    };
    this.users.set(user.id, user);
    return cloneRecord(user);
  }

  async getSettings(): Promise<ShopSettings> {
    if (!this.settings) {
      this.settings = {
        id: 1,
        shopName: "My Shop",
        whatsappGroupLink: null,
        customFields: [],
      };
    }
    const settings = this.settings;
    return cloneRecord(settings);
  }

  async updateSettings(data: Partial<InsertShopSettings>): Promise<ShopSettings> {
    const current = await this.getSettings();
    const customFields = (data.customFields as CustomFieldDef[] | null | undefined) ?? current.customFields;
    this.settings = {
      ...current,
      ...data,
      whatsappGroupLink: data.whatsappGroupLink ?? current.whatsappGroupLink,
      customFields,
    };
    const settings = this.settings;
    return cloneRecord(settings);
  }

  async getClosingByDate(date: string): Promise<DailyClosing | undefined> {
    const closing = Array.from(this.closings.values()).find((entry) => entry.date === date);
    return closing ? cloneRecord(closing) : undefined;
  }

  async getClosingsByDateRange(from: string, to: string): Promise<DailyClosing[]> {
    return Array.from(this.closings.values())
      .filter((entry) => entry.date >= from && entry.date <= to)
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((entry) => cloneRecord(entry));
  }

  async createClosing(data: InsertDailyClosing): Promise<DailyClosing> {
    const closing: DailyClosing = {
      id: this.nextClosingId++,
      date: data.date,
      previousCashBalance: data.previousCashBalance ?? 0,
      currentCashBalance: data.currentCashBalance ?? 0,
      totalExpenses: data.totalExpenses ?? 0,
      expenseNotes: data.expenseNotes ?? null,
      salesCash: data.salesCash ?? 0,
      salesUpi: data.salesUpi ?? 0,
      salesCard: data.salesCard ?? 0,
      totalCustomerVisits: data.totalCustomerVisits ?? 0,
      stockNotes: data.stockNotes ?? null,
      electricityMeterReading: data.electricityMeterReading ?? null,
      customFieldValues: data.customFieldValues ?? {},
      notes: data.notes ?? null,
      status: data.status ?? "draft",
      sentToWhatsapp: data.sentToWhatsapp ?? false,
    };
    this.closings.set(closing.id, closing);
    return cloneRecord(closing);
  }

  async updateClosing(id: number, data: Partial<InsertDailyClosing>): Promise<DailyClosing> {
    const existing = this.closings.get(id);
    if (!existing) {
      throw new Error("Closing not found");
    }

    const updated: DailyClosing = {
      ...existing,
      ...data,
      expenseNotes: data.expenseNotes === undefined ? existing.expenseNotes : data.expenseNotes ?? null,
      stockNotes: data.stockNotes === undefined ? existing.stockNotes : data.stockNotes ?? null,
      electricityMeterReading:
        data.electricityMeterReading === undefined
          ? existing.electricityMeterReading
          : data.electricityMeterReading ?? null,
      customFieldValues: data.customFieldValues ?? existing.customFieldValues,
      notes: data.notes === undefined ? existing.notes : data.notes ?? null,
      status: data.status ?? existing.status,
      sentToWhatsapp: data.sentToWhatsapp ?? existing.sentToWhatsapp,
    };

    this.closings.set(id, updated);
    return cloneRecord(updated);
  }

  async getAllClosings(): Promise<DailyClosing[]> {
    return Array.from(this.closings.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((entry) => cloneRecord(entry));
  }
}

export const usingMemoryStorage = !hasDatabase;
export const storage: IStorage = usingMemoryStorage ? new MemoryStorage() : new DatabaseStorage();
