/**
 * Municipal Service Boundaries and Coordinate Security
 * DEC-01 Municipal Boundary: Alexandria Governorate
 * Covers from Borg El Arab & Agami in the west to Abu Qir & Montaza in the east.
 * Reference: MADINATY_COMPLETE_PROJECT_BLUEPRINT_EN.md (§5, §7, §11, §22)
 */

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Service boundary for Alexandria Governorate (DEC-01).
 * Min Lat: 30.80, Max Lat: 31.40, Min Lng: 29.40, Max Lng: 30.40
 */
export const DEFAULT_SERVICE_BOUNDARY: BoundingBox = {
  minLat: 30.80,
  maxLat: 31.40,
  minLng: 29.40,
  maxLng: 30.40,
};

/**
 * Checks whether given latitude and longitude coordinates fall inside the boundary box.
 */
export function isCoordinatesInBounds(
  lat: number,
  lng: number,
  bounds: BoundingBox = DEFAULT_SERVICE_BOUNDARY
): boolean {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return false;
  }
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
}

/**
 * Validates report coordinates against planetary and municipal service area constraints.
 */
export function validateReportCoordinates(
  lat: number,
  lng: number,
  bounds: BoundingBox = DEFAULT_SERVICE_BOUNDARY
): { valid: boolean; error?: string } {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return { valid: false, error: "الإحداثيات الجغرافية غير صالحة." };
  }

  // Planetary bounds
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, error: "الإحداثيات الجغرافية تقع خارج نطاق الكرة الأرضية." };
  }

  // Municipal boundary
  if (!isCoordinatesInBounds(lat, lng, bounds)) {
    return {
      valid: false,
      error: "الموقع المحدد يقع خارج النطاق الجغرافي المعتمد لخدمات البلدية (نطاق محافظة الإسكندرية).",
    };
  }

  return { valid: true };
}

/**
 * Coordinate Fuzzing / Jitter for resident privacy protection (Blueprint §7, §11, DEC-01).
 * Prevents exposing raw citizen doorstep coordinates in public views and cluster pins.
 */
export function fuzzCoordinates(
  lat: number,
  lng: number,
  precision: "EXACT" | "APPROXIMATE" | "DISTRICT" = "APPROXIMATE"
): { latitude: number; longitude: number } {
  if (precision === "EXACT") {
    return { latitude: lat, longitude: lng };
  }

  if (precision === "DISTRICT") {
    // Round to 1 decimal place (~11 km radius, district-level)
    return {
      latitude: Math.round(lat * 10) / 10,
      longitude: Math.round(lng * 10) / 10,
    };
  }

  // APPROXIMATE: Round to 3 decimal places (~110 meters radius)
  return {
    latitude: Math.round(lat * 1000) / 1000,
    longitude: Math.round(lng * 1000) / 1000,
  };
}
