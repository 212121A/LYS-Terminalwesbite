import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type GlobalWithPool = typeof globalThis & { __lysPgPool?: pg.Pool };

function createPool(): pg.Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL fehlt. Supabase → Project Settings → Database → Connection string (URI), z. B. Direct connection (Port 5432).",
    );
  }

  const isSupabase = url.includes("supabase.co") || url.includes("supabase.com");
  return new Pool({
    connectionString: url,
    max: 5,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 10_000,
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

/** Ein Pool pro Serverless-Instanz (Vercel) wiederverwenden. */
export function getPool(): pg.Pool {
  const g = globalThis as GlobalWithPool;
  if (!g.__lysPgPool) {
    g.__lysPgPool = createPool();
  }
  return g.__lysPgPool;
}

let dbSingleton: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbSingleton) {
    dbSingleton = drizzle(getPool(), { schema });
  }
  return dbSingleton;
}

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL?.trim();
}

export * from "./schema";
