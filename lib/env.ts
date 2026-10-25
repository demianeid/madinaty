import { z } from "zod";

/**
 * Server-side environment schema
 * Secrets must never be exposed to the client or have NEXT_PUBLIC_ prefixes.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .default(
      process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/madinaty?schema=public"
    ),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters long")
    .default(
      process.env.BETTER_AUTH_SECRET ||
        "madinaty-development-super-secret-key-at-least-32-chars-long"
    ),
  BETTER_AUTH_URL: z
    .string()
    .url("BETTER_AUTH_URL must be a valid URL")
    .default(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default((process.env.NODE_ENV as "development" | "test" | "production") || "development"),
  GEMINI_API_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Madinaty <notifications@madinaty.local>"),
  SENTRY_DSN: z.string().optional(),
});

/**
 * Public client-side environment schema
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  NEXT_PUBLIC_MAP_TILE_URL: z
    .string()
    .default("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
});

// Guard: verify that no secrets accidentally have NEXT_PUBLIC_ prefix
for (const key of Object.keys(process.env)) {
  if (
    key.startsWith("NEXT_PUBLIC_") &&
    (key.includes("SECRET") ||
      key.includes("KEY") ||
      key.includes("PASSWORD") ||
      key.includes("DATABASE"))
  ) {
    throw new Error(
      `Security violation: Secret environment variable "${key}" is exposed with NEXT_PUBLIC_ prefix.`
    );
  }
}

export const serverEnv = serverEnvSchema.parse(process.env);
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_MAP_TILE_URL: process.env.NEXT_PUBLIC_MAP_TILE_URL,
});
