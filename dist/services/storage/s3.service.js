import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spacesClient } from "../do/spaces.config.js";
import { env } from "../../config/env.js";
export class S3Service {
    bucket = env.spaces.bucket;
    cdnEndpoint = env.spaces.cdnEndpoint;
    async getPresignedUploadUrl(prefix, key, contentType, size, checksumSHA256) {
        const fullKey = `${prefix}/${key}`;
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: fullKey,
            ContentType: contentType,
        });
        const url = await getSignedUrl(spacesClient, command, { expiresIn: 900 }); // 15 minutes
        return { url, key: fullKey };
    }
    getPublicUrl(key) {
        if (this.cdnEndpoint) {
            return `${this.cdnEndpoint}/${key}`;
        }
        return `https://${this.bucket}.${env.spaces.region}.digitaloceanspaces.com/${key}`;
    }
    async delete(key) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        await spacesClient.send(command);
    }
    async checkExists(key) {
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
    async move(sourceKey, destinationKey) {
        const { CopyObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
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
    async getPresignedDownloadUrl(key) {
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return getSignedUrl(spacesClient, command, { expiresIn: 3600 }); // 1 hour
    }
}
export const storageService = new S3Service();
//# sourceMappingURL=s3.service.js.map