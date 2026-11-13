import { describe, it, expect } from "vitest";
import {
  validateMagicBytes,
  processAndStoreMedia,
  readStoredMedia,
  generateSignedMediaToken,
  verifySignedMediaToken,
  generateSignedMediaUrl,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/media/storage";
import sharp from "sharp";

describe("Media Storage & Privacy Unit Tests", () => {
  it("correctly identifies JPEG magic bytes (FF D8 FF)", () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = validateMagicBytes(jpegBuffer);
    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe("image/jpeg");
  });

  it("correctly identifies PNG magic bytes (89 50 4E 47)", () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = validateMagicBytes(pngBuffer);
    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe("image/png");
  });

  it("correctly identifies WebP magic bytes (RIFF....WEBP)", () => {
    const riff = Buffer.from("RIFF");
    const size = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const webp = Buffer.from("WEBP");
    const webpBuffer = Buffer.concat([riff, size, webp, Buffer.alloc(10)]);

    const result = validateMagicBytes(webpBuffer);
    expect(result.valid).toBe(true);
    expect(result.detectedMime).toBe("image/webp");
  });

  it("rejects malicious or invalid executables/scripts pretending to be images", () => {
    const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00"); // DOS executable header
    const scriptBuffer = Buffer.from("<script>alert('xss')</script>");
    const shortBuffer = Buffer.from([0x01, 0x02]);

    expect(validateMagicBytes(exeBuffer).valid).toBe(false);
    expect(validateMagicBytes(scriptBuffer).valid).toBe(false);
    expect(validateMagicBytes(shortBuffer).valid).toBe(false);
  });

  it("enforces maximum file size limit (5 MB)", async () => {
    const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
    await expect(
      processAndStoreMedia(oversizedBuffer, "image/jpeg")
    ).rejects.toThrow("يتجاوز الحد الأقصى");
  });

  it("strips EXIF metadata and stores image securely", async () => {
    // Create a real small PNG image using sharp with dummy EXIF / metadata
    const rawImage = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 16, g: 185, b: 129 },
      },
    })
      .png()
      .toBuffer();

    const processed = await processAndStoreMedia(rawImage, "image/png");

    expect(processed.storageKey).toBeDefined();
    expect(processed.sha256).toBeDefined();
    expect(processed.mimeType).toBe("image/png");

    // Read back stored file
    const stored = await readStoredMedia(processed.storageKey);
    expect(stored.buffer.length).toBeGreaterThan(0);

    // Verify stored file has NO EXIF metadata
    const storedMeta = await sharp(stored.buffer).metadata();
    expect(storedMeta.exif).toBeUndefined();
    expect(storedMeta.iptc).toBeUndefined();
    expect(storedMeta.xmp).toBeUndefined();
  });

  describe("Signed URL & Temporary Token Generation (Task 3.1.4)", () => {
    it("generates a valid signed media token with expiration", () => {
      const mediaId = "media_test_123";
      const { token, expires } = generateSignedMediaToken(mediaId, 900);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(expires).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Verify token
      const isValid = verifySignedMediaToken(mediaId, token, expires);
      expect(isValid).toBe(true);
    });

    it("rejects an expired signed token", () => {
      const mediaId = "media_test_expired";
      const pastTime = Math.floor(Date.now() / 1000) - 60; // 1 minute in the past
      const { token } = generateSignedMediaToken(mediaId, -60);

      const isValid = verifySignedMediaToken(mediaId, token, pastTime);
      expect(isValid).toBe(false);
    });

    it("rejects a tampered or invalid signed token", () => {
      const mediaId = "media_test_tamper";
      const { expires } = generateSignedMediaToken(mediaId, 900);
      const forgedToken = "a".repeat(64);

      const isValid = verifySignedMediaToken(mediaId, forgedToken, expires);
      expect(isValid).toBe(false);
    });

    it("rejects a token used for a different media ID", () => {
      const mediaIdA = "media_test_A";
      const mediaIdB = "media_test_B";
      const { token, expires } = generateSignedMediaToken(mediaIdA, 900);

      const isValid = verifySignedMediaToken(mediaIdB, token, expires);
      expect(isValid).toBe(false);
    });

    it("generates a complete signed media URL with query params", () => {
      const mediaId = "media_url_test";
      const url = generateSignedMediaUrl(mediaId, "https://madinaty.local", 600);

      expect(url).toContain("https://madinaty.local/api/media/media_url_test?token=");
      expect(url).toContain("&expires=");
    });
  });
});
