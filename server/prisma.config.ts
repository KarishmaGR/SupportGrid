import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `env()` throws at config-load time if unset, which breaks `prisma generate`
    // during the Docker build stage (no DATABASE_URL until the container runs).
    url: process.env.DATABASE_URL ?? "postgresql://placeholder",
  },
});
