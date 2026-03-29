import type { IStorageService } from "./storage.interface.js";
export declare class S3Service implements IStorageService {
    private bucket;
    private cdnEndpoint;
    getPresignedUploadUrl(prefix: string, key: string, contentType: string, size: number, checksumSHA256: string): Promise<{
        url: string;
        key: string;
    }>;
    getPublicUrl(key: string): string;
    delete(key: string): Promise<void>;
    checkExists(key: string): Promise<{
        size: number;
        mimeType: string;
        etag: string;
    }>;
    move(sourceKey: string, destinationKey: string): Promise<void>;
    getPresignedDownloadUrl(key: string): Promise<string>;
}
export declare const storageService: S3Service;
//# sourceMappingURL=s3.service.d.ts.map