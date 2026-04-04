import { type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../config/db.js";
import { storageService } from "../../services/storage/s3.service.js";
import {
  getFolderByPurpose,
  slugifyFilename,
  getPurposeByFolder,
} from "./file.utils.js";
import { env } from "../../config/env.js";
import { HttpError } from "../common/errors.js";
import {
  readBody,
  requireUserId,
  readValidatedQuery,
} from "../common/requestContext.js";
import type { ConfirmUploadDto, GetDownloadUrlDto, InitUploadDto } from "./file.dto.js";

export async function initUpload(req: Request, res: Response) {
  const { fileName, mimeType, size, purpose, checksum } = readBody<InitUploadDto>(req);
  const folder = getFolderByPurpose(purpose);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uuid = uuidv4();
  const slug = slugifyFilename(fileName);

  const key = `temp/${folder}/${year}/${month}/${uuid}-${slug}`;

  // Get presigned URL
  const { url, key: finalKey } = await storageService.getPresignedUploadUrl(
    "", // prefix is already in key
    key,
    mimeType,
    size,
    checksum,
  );

  res.json({
    url,
    key: finalKey,
  });
}

export async function confirmUpload(req: Request, res: Response) {
  const { key, checksum } = readBody<ConfirmUploadDto>(req);

  // 1. Verify file exists in S3 & Get Metadata (ETag, Size, Mime)
  const metadata = await storageService.checkExists(key);

  // 2. Integrity Check (If checksum provided)
  if (checksum) {
    if (metadata.etag !== checksum) {
      // Mismatch! Delete file and throw error
      await storageService.delete(key);
      throw HttpError.badRequest(
        `Checksum mismatch. Expected ${checksum}, got ${metadata.etag}`,
        "INTEGRITY_CHECK_FAILED",
      );
    }
  }

  // 3. Move from temp to final
  // Key must be a safe temp path: no path traversal characters allowed.
  const VALID_TEMP_KEY = /^temp\/[a-zA-Z0-9/_.-]+$/;
  if (!VALID_TEMP_KEY.test(key)) {
    throw HttpError.badRequest("Invalid key format.");
  }
  const finalKey = key.slice(5); // remove leading "temp/"

  await storageService.move(key, finalKey);

  const parts = finalKey.split("/");
  const folder = parts[0] || "others";
  const purpose = getPurposeByFolder(folder);

  const file = await prisma.file.create({
    data: {
      key: finalKey,
      bucket: env.spaces.bucket,
      name: finalKey.split("-").slice(1).join("-"),
      mimeType: metadata.mimeType,
      size: metadata.size,
      purpose,
      checksum: metadata.etag, // Store MD5/ETag as checksum
      userId: requireUserId(req),
    },
  });

  res.json({
    file,
    publicUrl: storageService.getPublicUrl(finalKey),
  });
}

export async function getDownloadUrl(req: Request, res: Response) {
  const { key } = readValidatedQuery<GetDownloadUrlDto>(req);
  const userId = requireUserId(req);

  // Check if file exists in DB and is active
  const file = await prisma.file.findUnique({ where: { key, isActive: true } });
  if (!file) {
    throw HttpError.notFound("File not found");
  }

  // Enforce ownership for private files
  if (!file.isPublic && file.userId !== userId) {
    throw HttpError.forbidden("Unauthorized");
  }

  const url = await storageService.getPresignedDownloadUrl(key);

  res.json({
    url,
    key,
  });
}

export async function deleteFile(req: Request, res: Response) {
  const { key } = req.params;
  if (!key) throw HttpError.badRequest("Key is required");

  const userId = requireUserId(req);

  // Find file and verify ownership
  const file = await prisma.file.findUnique({ where: { key, isActive: true } });

  if (!file) {
    throw HttpError.notFound("File not found");
  }

  if (file.userId !== userId) {
    throw HttpError.forbidden("Unauthorized");
  }

  // Soft Delete: Set isActive = false
  await prisma.file.update({
    where: { key },
    data: { isActive: false },
  });

  res.json({ success: true, message: "File deleted" });
}
