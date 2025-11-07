import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function initDb() {
  try {
    console.log("Testing database connection...");
    
    // Test connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("✓ Database connection successful");
    
    // Check if tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log("\nExisting tables:");
    if (tables.rows.length === 0) {
      console.log("  No tables found - you need to run: npm run db:push");
    } else {
      tables.rows.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    // Check if enums exist
    const enums = await db.execute(sql`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
      ORDER BY typname
    `);
    
    console.log("\nExisting enum types:");
    if (enums.rows.length === 0) {
      console.log("  No enums found");
    } else {
      enums.rows.forEach((row: any) => {
        console.log(`  - ${row.typname}`);
      });
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error("✗ Database error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

initDb();

