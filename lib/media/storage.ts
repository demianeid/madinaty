import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// Allowed MIME types
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image
export const MAX_FILES_PER_OPERATION = 5;

// Local private storage root for Phase 2 (prior to Cloudinary in Phase 3)
const STORAGE_DIR = path.resolve(process.cwd(), "storage/media");

/**
 * Validates magic bytes of an image buffer to prevent file extension spoofing.
 */
export function validateMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: AllowedMimeType } {
  if (buffer.length < 4) return { valid: false };

  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // PNG magic bytes: 89 50 4E 47 (0x89 'P' 'N' 'G')
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, detectedMime: "image/png" };
  }

  // WebP magic bytes: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { valid: true, detectedMime: "image/webp" };
  }

  return { valid: false };
}

export interface ProcessedMedia {
  storageKey: string;
  mimeType: AllowedMimeType;
  sizeBytes: number;
  width?: number;
  height?: number;
  sha256: string;
}

/**
 * Strips all EXIF/GPS metadata from an image, re-encodes it securely,
 * and writes it to private storage.
 */
export async function processAndStoreMedia(
  inputBuffer: Buffer,
  declaredMimeType?: string
): Promise<ProcessedMedia> {
  if (declaredMimeType && !declaredMimeType.startsWith("image/")) {
    throw new Error("نوع الملف المصرح به غير مدعوم.");
  }

  if (inputBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`حجم الملف يتجاوز الحد الأقصى المسموح به (5 ميجابايت).`);
  }

  // Magic bytes check
  const magic = validateMagicBytes(inputBuffer);
  if (!magic.valid || !magic.detectedMime) {
    throw new Error("نوع الملف غير مدعوم. الأنواع المقبولة هي: JPG, PNG, WebP.");
  }

  // Ensure storage directory exists
  await fs.mkdir(STORAGE_DIR, { recursive: true });

  // Process image with Sharp: strip EXIF metadata, auto-orient, optimize
  const image = sharp(inputBuffer, { failOn: "error" }).rotate();
  const metadata = await image.metadata();

  // Strip all metadata (EXIF, IPTC, XMP, GPS)
  let cleanBuffer: Buffer;
  let ext: string;
  let finalMime: AllowedMimeType;

  if (magic.detectedMime === "image/png") {
    cleanBuffer = await image.png({ compressionLevel: 8 }).toBuffer();
    ext = "png";
    finalMime = "image/png";
  } else if (magic.detectedMime === "image/webp") {
    cleanBuffer = await image.webp({ quality: 85 }).toBuffer();
    ext = "webp";
    finalMime = "image/webp";
  } else {
    // Default to JPEG
    cleanBuffer = await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    ext = "jpg";
    finalMime = "image/jpeg";
  }

  // Generate SHA-256 hash for deduplication and storage key
  const sha256 = crypto.createHash("sha256").update(cleanBuffer).digest("hex");
  const fileName = `${sha256}.${ext}`;
  const filePath = path.join(STORAGE_DIR, fileName);

  await fs.writeFile(filePath, cleanBuffer);

  return {
    storageKey: fileName,
    mimeType: finalMime,
    sizeBytes: cleanBuffer.length,
    width: metadata.width,
    height: metadata.height,
    sha256,
  };
}

/**
 * Retrieves a media file stream from private storage.
 */
export async function readStoredMedia(storageKey: string): Promise<{ buffer: Buffer; filePath: string }> {
  // Prevent directory traversal attacks
  const sanitized = path.basename(storageKey);
  const filePath = path.join(STORAGE_DIR, sanitized);

  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, filePath };
  } catch {
    throw new Error("الملف المطلوب غير موجود في التخزين الآمن.");
  }
}
