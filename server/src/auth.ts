import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt, role } from "better-auth/plugins";
import { prisma } from "./db.ts";
import { UserRole } from "@supportgrid/shared";

export const auth = betterAuth({
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
      }
    }
  },
  trustedOrigins: ["http://localhost:5173", "http://localhost:4000"],
  plugins: [jwt()],
});

