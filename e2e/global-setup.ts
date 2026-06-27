import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, ".env.test");

config({ path: envPath });

const DB_URL = process.env.DATABASE_URL!;
const SERVER_DIR = resolve(__dirname, "../server");

async function globalSetup() {
  // Run all pending migrations against the test database
  execSync("bunx prisma migrate deploy", {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: DB_URL },
    stdio: "inherit",
  });

  // Seed test admin user via raw SQL (avoids depending on server's generated Prisma client)
  const pool = new pg.Pool({ connectionString: DB_URL });

  const email = process.env.TEST_ADMIN_EMAIL!;
  const password = process.env.TEST_ADMIN_PASSWORD!;

  const existing = await pool.query('SELECT id FROM "User" WHERE email = $1', [email]);

  if (existing.rows.length === 0) {
    const hashed = await hashPassword(password);
    const userId = randomUUID();
    const accountId = randomUUID();

    await pool.query('BEGIN');
    try {
      await pool.query(
        `INSERT INTO "User" (id, email, name, "emailVerified", role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, true, 'Admin', NOW(), NOW())`,
        [userId, email, "E2E Admin"],
      );
      await pool.query(
        `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())`,
        [accountId, userId, userId, hashed],
      );
      await pool.query('COMMIT');
      console.log(`[e2e] Seeded test admin: ${email}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } else {
    console.log(`[e2e] Test admin already exists: ${email}`);
  }

  await pool.end();
}

export default globalSetup;
