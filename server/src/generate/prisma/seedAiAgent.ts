import "dotenv/config";
import { UserRole } from "@supportgrid/shared";
import { prisma } from "../../db.ts";
import { AI_AGENT_ID, AI_AGENT_EMAIL } from "../../constants.ts";

async function seed() {
  await prisma.user.upsert({
    where: { email: AI_AGENT_EMAIL },
    create: {
      id: AI_AGENT_ID,
      email: AI_AGENT_EMAIL,
      name: "AI",
      emailVerified: true,
      role: UserRole.Agent,
      active: true,
    },
    update: {},
  });
  console.log(`Seeded AI agent: ${AI_AGENT_EMAIL} (${AI_AGENT_ID})`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
