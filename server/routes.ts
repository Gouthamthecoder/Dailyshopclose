import type { Express, Request, Response, NextFunction } from "express";
import { Router } from "express";
import type { Server } from "http";
import { dbPool, hasDatabase, storage, usingMemoryStorage } from "./storage";
import { insertDailyClosingSchema, insertShopSettingsSchema, loginSchema, registerSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { appBasePath } from "./base-path";

declare module "express-session" {
  interface SessionData {
    userId: string;
    shopId: string;
    role: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.shopId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.shopId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({
      message: "This account has access only to the Daily Closing page",
    });
  }
  next();
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getScopedShopId(req: Request): string {
  return req.session.shopId!;
}

function getDashboardShopId(req: Request): string | undefined {
  if (req.session.role !== "admin") {
    return req.session.shopId;
  }

  const requestedShopId = getSingleParam(req.query.shopId as string | string[] | undefined);
  return requestedShopId && requestedShopId !== "all" ? requestedShopId : undefined;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const api = Router();

  const SessionStore = MemoryStore(session);
  const PostgresSessionStore = connectPgSimple(session);
  const isProduction = process.env.NODE_ENV === "production";
  const usePostgresSessionStore =
    process.env.SESSION_STORE === "postgres" && hasDatabase && dbPool;
  const store =
    usePostgresSessionStore
      ? new PostgresSessionStore({
          pool: dbPool ?? undefined,
          createTableIfMissing: true,
        })
      : new SessionStore({ checkPeriod: 86400000 });

  if (isProduction) {
    app.set("trust proxy", 1);
  }
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-session-secret-change-me",
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
      },
    })
  );

  if (usingMemoryStorage) {
    console.warn("DATABASE_URL is not set. Running with in-memory storage for local development.");
  }

  if (!usePostgresSessionStore) {
    console.warn("Using MemoryStore for sessions. Set SESSION_STORE=postgres to enable Postgres-backed sessions.");
  }

  app.get(`${appBasePath}/healthz`, (_req, res) => {
    res.json({ ok: true });
  });

  api.post("/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByUsername(data.shopId, data.username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken for this shop" });
      }
      const hashed = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        shopId: data.shopId,
        username: data.username,
        password: hashed,
        role: "user",
      });
      await storage.getSettings(data.shopId);
      req.session.userId = user.id;
      req.session.shopId = user.shopId;
      req.session.role = user.role;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        res.status(201).json({ id: user.id, shopId: user.shopId, username: user.username, role: user.role });
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  api.post("/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(data.shopId, data.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.session.userId = user.id;
      req.session.shopId = user.shopId;
      req.session.role = user.role;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session error" });
        res.json({ id: user.id, shopId: user.shopId, username: user.username, role: user.role });
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  api.post("/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  api.get("/auth/user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ id: user.id, shopId: user.shopId, username: user.username, role: user.role });
  });

  api.get("/shops", requireAdmin, async (_req, res) => {
    try {
      const shops = await storage.listShops();
      res.json(shops);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  api.get("/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSettings(getScopedShopId(req));
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  api.put("/settings", requireAdmin, async (req, res) => {
    try {
      const parsed = insertShopSettingsSchema.partial().parse(req.body);
      const updated = await storage.updateSettings(getScopedShopId(req), parsed);
      res.json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  api.get("/closings", requireAuth, async (req, res) => {
    try {
      const { from, to } = req.query;
      const shopId = getDashboardShopId(req);
      if (from && to) {
        const closings = await storage.getClosingsByDateRange(from as string, to as string, shopId);
        return res.json(closings);
      }
      const all = await storage.getAllClosings(shopId);
      res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  api.get("/closings/:date", requireAuth, async (req, res) => {
    try {
      const date = getSingleParam(req.params.date);
      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }
      const closing = await storage.getClosingByDate(getScopedShopId(req), date);
      res.json(closing ?? null);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  api.post("/closings", requireAuth, async (req, res) => {
    try {
      const parsed = insertDailyClosingSchema.parse({
        ...req.body,
        shopId: getScopedShopId(req),
      });
      const existing = await storage.getClosingByDate(parsed.shopId, parsed.date);
      if (existing) {
        return res.status(409).json({ message: "A closing record already exists for this date in this shop" });
      }
      const closing = await storage.createClosing(parsed);
      res.status(201).json(closing);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  api.put("/closings/:id", requireAuth, async (req, res) => {
    try {
      const idParam = getSingleParam(req.params.id);
      const id = Number.parseInt(idParam ?? "", 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid closing id" });
      }
      const parsed = insertDailyClosingSchema.partial().parse({
        ...req.body,
        shopId: getScopedShopId(req),
      });
      const closing = await storage.updateClosing(id, getScopedShopId(req), parsed);
      res.json(closing);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors.map(e => e.message).join(", ") });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.use(`${appBasePath}/api`, api);

  return httpServer;
}
