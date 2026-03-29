import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spacesClient } from "../do/spaces.config.js";
import { env } from "../../config/env.js";
import type { IStorageService } from "./storage.interface.js";

export class S3Service implements IStorageService {
  private bucket = env.spaces.bucket;
  private cdnEndpoint = env.spaces.cdnEndpoint;

  async getPresignedUploadUrl(
    prefix: string,
    key: string,
    contentType: string,
    size: number,
    checksumSHA256: string,
  ): Promise<{ url: string; key: string }> {
    const fullKey = `${prefix}/${key}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
      ContentType: contentType,
    });

    const url = await getSignedUrl(spacesClient, command, { expiresIn: 900 }); // 15 minutes

    return { url, key: fullKey };
  }

  getPublicUrl(key: string): string {
    if (this.cdnEndpoint) {
      return `${this.cdnEndpoint}/${key}`;
    }
    return `https://${this.bucket}.${env.spaces.region}.digitaloceanspaces.com/${key}`;
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await spacesClient.send(command);
  }

  async checkExists(
    key: string,
  ): Promise<{ size: number; mimeType: string; etag: string }> {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await spacesClient.send(command);

    return {
      size: response.ContentLength || 0,
      mimeType: response.ContentType || "application/octet-stream",
      etag: response.ETag?.replace(/"/g, "") || "",
    };
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    const { CopyObjectCommand, DeleteObjectCommand } =
      await import("@aws-sdk/client-s3");

    // 1. Copy
    const copyCommand = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destinationKey,
    });
    await spacesClient.send(copyCommand);

    // 2. Delete Source
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: sourceKey,
    });
    await spacesClient.send(deleteCommand);
  }

  async getPresignedDownloadUrl(key: string): Promise<string> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(spacesClient, command, { expiresIn: 3600 }); // 1 hour
  }
}

export const storageService = new S3Service();
