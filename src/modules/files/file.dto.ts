import { z } from "zod";
import { FilePurpose } from "@prisma/client";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/x-matroska",
  "video/x-msvideo",
  "video/quicktime",
  "application/pdf",
  "application/octet-stream",
] as const;

export const initUploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  size: z.number().positive(),
  purpose: z.enum(FilePurpose),
  checksum: z.string().min(10, "Invalid checksum"), // Basic length check for SHA256 base64
});

export const confirmUploadSchema = z.object({
  key: z.string().min(1),
  checksum: z.string().optional(), // Optional MD5 for verification
});

export const getDownloadUrlSchema = z.object({
  key: z.string().min(1),
});

export type InitUploadDto = z.infer<typeof initUploadSchema>;
export type ConfirmUploadDto = z.infer<typeof confirmUploadSchema>;
export type GetDownloadUrlDto = z.infer<typeof getDownloadUrlSchema>;
