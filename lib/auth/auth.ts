import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db/prisma";
import { serverEnv } from "@/lib/env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // can be toggled per env
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "CITIZEN",
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "ACTIVE",
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
      preferredLocale: {
        type: "string",
        required: false,
        defaultValue: "ar",
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
