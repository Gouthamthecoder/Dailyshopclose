import { randomUUID } from "crypto";
import { eq, and, gte, lte, asc } from "drizzle-orm";
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

export const dbPool = pool;
export const db = pool ? drizzle(pool) : null;
export { hasDatabase };

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(shopId: string, username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;

  getSettings(shopId: string): Promise<ShopSettings>;
  updateSettings(shopId: string, data: Partial<InsertShopSettings>): Promise<ShopSettings>;

  getClosingByDate(shopId: string, date: string): Promise<DailyClosing | undefined>;
  getClosingsByDateRange(from: string, to: string, shopId?: string): Promise<DailyClosing[]>;
  createClosing(data: InsertDailyClosing): Promise<DailyClosing>;
  updateClosing(id: number, shopId: string, data: Partial<InsertDailyClosing>): Promise<DailyClosing>;
  getAllClosings(shopId?: string): Promise<DailyClosing[]>;
  listShops(): Promise<Array<{ shopId: string; shopName: string }>>;
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

  async getUserByUsername(shopId: string, username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.shopId, shopId), eq(users.username, username)));
    return user;
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getSettings(shopId: string): Promise<ShopSettings> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [existing] = await db.select().from(shopSettings).where(eq(shopSettings.shopId, shopId));
    if (existing) return existing;
    const [created] = await db.insert(shopSettings).values({ shopId, shopName: "My Shop" }).returning();
    return created;
  }

  async updateSettings(shopId: string, data: Partial<InsertShopSettings>): Promise<ShopSettings> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const current = await this.getSettings(shopId);
    const [updated] = await db
      .update(shopSettings)
      .set({ ...data, shopId } as any)
      .where(eq(shopSettings.id, current.id))
      .returning();
    return updated;
  }

  async getClosingByDate(shopId: string, date: string): Promise<DailyClosing | undefined> {
    if (!db) return undefined;
    const [closing] = await db
      .select()
      .from(dailyClosings)
      .where(and(eq(dailyClosings.shopId, shopId), eq(dailyClosings.date, date)));
    return closing;
  }

  async getClosingsByDateRange(from: string, to: string, shopId?: string): Promise<DailyClosing[]> {
    if (!db) return [];
    const conditions = [gte(dailyClosings.date, from), lte(dailyClosings.date, to)];
    if (shopId) {
      conditions.push(eq(dailyClosings.shopId, shopId));
    }
    return db
      .select()
      .from(dailyClosings)
      .where(and(...conditions))
      .orderBy(asc(dailyClosings.shopId), asc(dailyClosings.date));
  }

  async createClosing(data: InsertDailyClosing): Promise<DailyClosing> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [closing] = await db.insert(dailyClosings).values(data).returning();
    return closing;
  }

  async updateClosing(id: number, shopId: string, data: Partial<InsertDailyClosing>): Promise<DailyClosing> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const [closing] = await db
      .update(dailyClosings)
      .set({ ...data, shopId })
      .where(and(eq(dailyClosings.id, id), eq(dailyClosings.shopId, shopId)))
      .returning();
    return closing;
  }

  async getAllClosings(shopId?: string): Promise<DailyClosing[]> {
    if (!db) return [];
    return db
      .select()
      .from(dailyClosings)
      .where(shopId ? eq(dailyClosings.shopId, shopId) : undefined)
      .orderBy(asc(dailyClosings.shopId), asc(dailyClosings.date));
  }

  async listShops(): Promise<Array<{ shopId: string; shopName: string }>> {
    if (!db) return [];
    return db
      .select({ shopId: shopSettings.shopId, shopName: shopSettings.shopName })
      .from(shopSettings)
      .orderBy(asc(shopSettings.shopName));
  }
}

class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private settings = new Map<string, ShopSettings>();
  private closings = new Map<number, DailyClosing>();
  private nextClosingId = 1;

  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    return user ? cloneRecord(user) : undefined;
  }

  async getUserByUsername(shopId: string, username: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(
      (entry) => entry.shopId === shopId && entry.username === username,
    );
    return user ? cloneRecord(user) : undefined;
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const user: User = {
      id: randomUUID(),
      shopId: insertUser.shopId,
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role ?? "user",
    };
    this.users.set(user.id, user);
    return cloneRecord(user);
  }

  async getSettings(shopId: string): Promise<ShopSettings> {
    const existing = this.settings.get(shopId);
    if (!existing) {
      const created: ShopSettings = {
        id: 1,
        shopId,
        shopName: "My Shop",
        whatsappGroupLink: null,
        customFields: [],
      };
      this.settings.set(shopId, created);
      return cloneRecord(created);
    }
    return cloneRecord(existing);
  }

  async updateSettings(shopId: string, data: Partial<InsertShopSettings>): Promise<ShopSettings> {
    const current = await this.getSettings(shopId);
    const customFields = (data.customFields as CustomFieldDef[] | null | undefined) ?? current.customFields;
    const updated: ShopSettings = {
      ...current,
      ...data,
      shopId,
      whatsappGroupLink: data.whatsappGroupLink ?? current.whatsappGroupLink,
      customFields,
    };
    this.settings.set(shopId, updated);
    return cloneRecord(updated);
  }

  async getClosingByDate(shopId: string, date: string): Promise<DailyClosing | undefined> {
    const closing = Array.from(this.closings.values()).find((entry) => entry.shopId === shopId && entry.date === date);
    return closing ? cloneRecord(closing) : undefined;
  }

  async getClosingsByDateRange(from: string, to: string, shopId?: string): Promise<DailyClosing[]> {
    return Array.from(this.closings.values())
      .filter((entry) => (!shopId || entry.shopId === shopId) && entry.date >= from && entry.date <= to)
      .sort((left, right) => left.shopId.localeCompare(right.shopId) || left.date.localeCompare(right.date))
      .map((entry) => cloneRecord(entry));
  }

  async createClosing(data: InsertDailyClosing): Promise<DailyClosing> {
    const closing: DailyClosing = {
      id: this.nextClosingId++,
      shopId: data.shopId,
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

  async updateClosing(id: number, shopId: string, data: Partial<InsertDailyClosing>): Promise<DailyClosing> {
    const existing = this.closings.get(id);
    if (!existing || existing.shopId !== shopId) {
      throw new Error("Closing not found");
    }

    const updated: DailyClosing = {
      ...existing,
      ...data,
      shopId,
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

  async getAllClosings(shopId?: string): Promise<DailyClosing[]> {
    return Array.from(this.closings.values())
      .filter((entry) => !shopId || entry.shopId === shopId)
      .sort((left, right) => left.shopId.localeCompare(right.shopId) || left.date.localeCompare(right.date))
      .map((entry) => cloneRecord(entry));
  }

  async listShops(): Promise<Array<{ shopId: string; shopName: string }>> {
    return Array.from(this.settings.values())
      .sort((left, right) => left.shopName.localeCompare(right.shopName))
      .map((entry) => ({ shopId: entry.shopId, shopName: entry.shopName }));
  }
}

export const usingMemoryStorage = !hasDatabase;
export const storage: IStorage = usingMemoryStorage ? new MemoryStorage() : new DatabaseStorage();
