// Seed script: deployed Admin user + a couple of demo tickets.
// Run with: bun run db:seed  (or `bun prisma db seed`)
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  // Deployed admin (implementation-plan Phase 2). Password hashing is wired in
  // Phase 2; this placeholder hash is replaced when auth lands.
  await prisma.user.upsert({
    where: { email: "admin@supportgrid.local" },
    update: {},
    create: {
      email: "admin@supportgrid.local",
      name: "SupportGrid Admin",
      role: "Admin",
    },
  });

  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0) {
    await prisma.ticket.create({
      data: {
        subject: "How do I reset my password?",
        requesterEmail: "student1@example.edu",
        messages: {
          create: {
            direction: "inbound",
            from: "student1@example.edu",
            body: "I forgot my password and can't log in to the portal.",
          },
        },
      },
    });
    await prisma.ticket.create({
      data: {
        subject: "Requesting a refund for the wrong course",
        requesterEmail: "student2@example.edu",
        category: "Refund",
        messages: {
          create: {
            direction: "inbound",
            from: "student2@example.edu",
            body: "I accidentally enrolled in the wrong course and would like a refund.",
          },
        },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
