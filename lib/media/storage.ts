import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { serverEnv } from "@/lib/env";

// Allowed MIME types
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image
export const MAX_FILES_PER_OPERATION = 5;
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 15 * 60; // 15 minutes TTL

// Local private storage root (used when Cloudinary is not configured or in dev/test)
const STORAGE_DIR = path.resolve(process.cwd(), "storage/media");

/**
 * Configure Cloudinary if credentials are provided in environment
 */
const isCloudinaryConfigured = Boolean(
  serverEnv.CLOUDINARY_CLOUD_NAME &&
  serverEnv.CLOUDINARY_API_KEY &&
  serverEnv.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME,
    api_key: serverEnv.CLOUDINARY_API_KEY,
    api_secret: serverEnv.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

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
  storageProvider: "cloudinary" | "local";
  storageKey: string;
  mimeType: AllowedMimeType;
  sizeBytes: number;
  width?: number;
  height?: number;
  sha256: string;
}

/**
 * Strips all EXIF/GPS metadata from an image, re-encodes it securely,
 * and writes it to private storage (Cloudinary if configured, else local filesystem).
 */
export async function processAndStoreMedia(
  inputBuffer: Buffer,
  declaredMimeType?: string
): Promise<ProcessedMedia> {
  if (declaredMimeType && !declaredMimeType.startsWith("image/")) {
    throw new Error("نوع الملف المصرح به غير مدعوم.");
  }

  if (inputBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("حجم الملف يتجاوز الحد الأقصى المسموح به (5 ميجابايت).");
  }

  // Magic bytes check
  const magic = validateMagicBytes(inputBuffer);
  if (!magic.valid || !magic.detectedMime) {
    throw new Error("نوع الملف غير مدعوم. الأنواع المقبولة هي: JPG, PNG, WebP.");
  }

  // Process image with Sharp: strip all EXIF metadata, auto-orient, optimize
  const image = sharp(inputBuffer, { failOn: "error" }).rotate();
  const metadata = await image.metadata();

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
    cleanBuffer = await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    ext = "jpg";
    finalMime = "image/jpeg";
  }

  // Generate SHA-256 hash for integrity and deduplication
  const sha256 = crypto.createHash("sha256").update(cleanBuffer).digest("hex");
  const fileName = `${sha256}.${ext}`;

  if (isCloudinaryConfigured) {
    // Cloudinary upload as authenticated private asset
    const uploadResult = await new Promise<{ public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "madinaty/reports",
          public_id: sha256,
          type: "authenticated",
          resource_type: "image",
          format: ext,
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("فشل رفع الصورة إلى التخزين السحابي Cloudinary."));
          } else {
            resolve({ public_id: result.public_id });
          }
        }
      );
      uploadStream.end(cleanBuffer);
    });

    return {
      storageProvider: "cloudinary",
      storageKey: uploadResult.public_id,
      mimeType: finalMime,
      sizeBytes: cleanBuffer.length,
      width: metadata.width,
      height: metadata.height,
      sha256,
    };
  }

  // Local fallback private storage
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const filePath = path.join(STORAGE_DIR, fileName);
  await fs.writeFile(filePath, cleanBuffer);

  return {
    storageProvider: "local",
    storageKey: fileName,
    mimeType: finalMime,
    sizeBytes: cleanBuffer.length,
    width: metadata.width,
    height: metadata.height,
    sha256,
  };
}

/**
 * Retrieves a media file buffer from private storage (local or Cloudinary).
 */
export async function readStoredMedia(storageKey: string): Promise<{ buffer: Buffer; filePath?: string }> {
  const sanitized = path.basename(storageKey);
  const filePath = path.join(STORAGE_DIR, sanitized);

  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, filePath };
  } catch {
    // If not on local filesystem and Cloudinary is configured, try downloading from Cloudinary
    if (isCloudinaryConfigured) {
      try {
        const downloadUrl = cloudinary.utils.private_download_url(storageKey, "jpg", {
          resource_type: "image",
          type: "authenticated",
          expires_at: Math.floor(Date.now() / 1000) + 300,
        });
        const res = await fetch(downloadUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return { buffer: Buffer.from(arrayBuffer) };
        }
      } catch {
        // Fall through to error
      }
    }
    throw new Error("الملف المطلوب غير موجود في التخزين الآمن.");
  }
}

/**
 * Generates an HMAC signature token for private media URL access with a short TTL (Task 3.1.4).
 */
export function generateSignedMediaToken(
  mediaId: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): { token: string; expires: number } {
  const secret = serverEnv.BETTER_AUTH_SECRET;
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${mediaId}:${expires}`;
  const token = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  return { token, expires };
}

/**
 * Validates a signed media token, ensuring it has not expired and was signed by our secret.
 */
export function verifySignedMediaToken(
  mediaId: string,
  token: string,
  expires: number
): boolean {
  if (!token || !expires || isNaN(expires)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > expires) {
    return false; // Expired TTL
  }

  const secret = serverEnv.BETTER_AUTH_SECRET;
  const expectedPayload = `${mediaId}:${expires}`;
  const expectedToken = crypto.createHmac("sha256", secret).update(expectedPayload).digest("hex");

  try {
    const tokenBuffer = Buffer.from(token, "hex");
    const expectedBuffer = Buffer.from(expectedToken, "hex");
    if (tokenBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a full signed URL for a media asset with short TTL (Task 3.1.4).
 */
export function generateSignedMediaUrl(
  mediaId: string,
  baseUrl: string = "",
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): string {
  const { token, expires } = generateSignedMediaToken(mediaId, expiresInSeconds);
  const path = `/api/media/${mediaId}?token=${token}&expires=${expires}`;
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}
