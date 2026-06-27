import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt } from "better-auth/plugins";
import { prisma } from "./db.ts";
import { UserRole } from "@supportgrid/shared";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET env var is required and must be at least 32 characters. " +
    "Generate one with: openssl rand -base64 32",
  );
}

export const auth = betterAuth({
  secret,
  basePath: "/api/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: UserRole.Agent,
        input: false,
      },
    },
  },
  trustedOrigins: ["http://localhost:5173", "http://localhost:4000"],
  plugins: [jwt()],
});
