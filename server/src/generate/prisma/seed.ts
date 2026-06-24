import "dotenv/config";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { UserRole } from "@supportgrid/shared";
import { prisma } from "../../db.ts";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error(
    "Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in environment.",
  );
  process.exit(1);
}

async function seed() {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const hashed = await hashPassword(password!);
  const userId = randomUUID();
  const accountId = randomUUID();

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        email: email!,
        name: "Admin",
        emailVerified: true,
        role: UserRole.Admin,
      },
    }),
    prisma.account.create({
      data: {
        id: accountId,
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashed,
      },
    }),
  ]);

  console.log(`Seeded admin user: ${email}`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
