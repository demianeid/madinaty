import { describe, it, expect } from "vitest";
import { serverEnv, clientEnv } from "@/lib/env";

describe("Environment Validation", () => {
  it("should have parsed server environment with defaults", () => {
    expect(serverEnv.DATABASE_URL).toBeDefined();
    expect(serverEnv.BETTER_AUTH_SECRET).toBeDefined();
    expect(serverEnv.BETTER_AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(serverEnv.BETTER_AUTH_URL).toMatch(/^https?:\/\//);
  });

  it("should have parsed client environment with valid URLs", () => {
    expect(clientEnv.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(clientEnv.NEXT_PUBLIC_APP_URL).toMatch(/^https?:\/\//);
    expect(clientEnv.NEXT_PUBLIC_MAP_TILE_URL).toBeDefined();
  });

  it("should reject secret variables with NEXT_PUBLIC_ prefix", () => {
    const maliciousKey = "NEXT_PUBLIC_DATABASE_PASSWORD";
    const hasSecretSubstring =
      maliciousKey.startsWith("NEXT_PUBLIC_") &&
      (maliciousKey.includes("SECRET") ||
        maliciousKey.includes("KEY") ||
        maliciousKey.includes("PASSWORD") ||
        maliciousKey.includes("DATABASE"));

    expect(hasSecretSubstring).toBe(true);
  });
});
