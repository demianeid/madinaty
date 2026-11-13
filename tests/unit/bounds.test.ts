import { describe, it, expect } from "vitest";
import {
  isCoordinatesInBounds,
  validateReportCoordinates,
  fuzzCoordinates,
} from "@/lib/reports/bounds";

describe("Geographic Service Boundaries & Coordinate Privacy (Epic 3.2)", () => {
  it("approves valid coordinates within municipal service area (Alexandria Governorate)", () => {
    // Mahatet El Raml / Corniche
    expect(isCoordinatesInBounds(31.2001, 29.9187)).toBe(true);
    // Sidi Gaber
    expect(isCoordinatesInBounds(31.2185, 29.9438)).toBe(true);
    // Montaza / Abu Qir
    expect(isCoordinatesInBounds(31.2885, 30.0152)).toBe(true);
    // Agami / Borg El Arab
    expect(isCoordinatesInBounds(31.1021, 29.7485)).toBe(true);

    const validation = validateReportCoordinates(31.2001, 29.9187);
    expect(validation.valid).toBe(true);
    expect(validation.error).toBeUndefined();
  });

  it("rejects coordinates outside municipal boundary with clear Arabic feedback", () => {
    // Cairo (outside Alexandria municipal service area)
    const cairoValidation = validateReportCoordinates(30.0444, 31.2357);
    expect(cairoValidation.valid).toBe(false);
    expect(cairoValidation.error).toContain("خارج النطاق الجغرافي المعتمد");
    expect(cairoValidation.error).toContain("الإسكندرية");

    // International coordinates (London)
    const londonValidation = validateReportCoordinates(51.5074, -0.1278);
    expect(londonValidation.valid).toBe(false);
    expect(londonValidation.error).toContain("خارج النطاق الجغرافي المعتمد");
  });

  it("rejects invalid or impossible planetary coordinates", () => {
    const invalidLat = validateReportCoordinates(105.0, 31.2);
    expect(invalidLat.valid).toBe(false);
    expect(invalidLat.error).toContain("الكرة الأرضية");

    const nanValidation = validateReportCoordinates(NaN, 31.2);
    expect(nanValidation.valid).toBe(false);
    expect(nanValidation.error).toContain("غير صالحة");
  });

  describe("Coordinate Fuzzing for Resident Doorstep Privacy (Task 3.2.4)", () => {
    const rawLat = 30.0444876;
    const rawLng = 31.2357123;

    it("returns exact coordinates when requested for authorized authority views", () => {
      const fuzzed = fuzzCoordinates(rawLat, rawLng, "EXACT");
      expect(fuzzed.latitude).toBe(rawLat);
      expect(fuzzed.longitude).toBe(rawLng);
    });

    it("fuzzes coordinates to ~110m radius for public/approximate views", () => {
      const fuzzed = fuzzCoordinates(rawLat, rawLng, "APPROXIMATE");
      // 3 decimal places
      expect(fuzzed.latitude).toBe(30.044);
      expect(fuzzed.longitude).toBe(31.236);
      expect(fuzzed.latitude).not.toBe(rawLat);
    });

    it("clusters coordinates to district level (~11km) for public aggregated views", () => {
      const fuzzed = fuzzCoordinates(rawLat, rawLng, "DISTRICT");
      // 1 decimal place
      expect(fuzzed.latitude).toBe(30.0);
      expect(fuzzed.longitude).toBe(31.2);
    });
  });
});

