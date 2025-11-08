import "dotenv/config";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if this is a Neon Database connection or regular PostgreSQL
// Neon connections typically contain 'neon.tech' in the hostname
// Local connections use 'localhost' or '127.0.0.1'
const isNeonConnection = process.env.DATABASE_URL.includes('neon.tech');

let pool: any;
let db: any;

if (isNeonConnection) {
  // Use Neon serverless driver for Neon Database
  const { Pool: NeonPool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle: neonDrizzle } = await import('drizzle-orm/neon-serverless');
  const wsModule = await import("ws");
  const ws = wsModule.default || wsModule;
  
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle({ client: pool, schema });
} else {
  // Use regular PostgreSQL driver for local or other PostgreSQL databases
  const { Pool: PgPool } = await import('pg');
  const { drizzle: pgDrizzle } = await import('drizzle-orm/node-postgres');
  
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = pgDrizzle({ client: pool, schema });
}

export { pool, db };
