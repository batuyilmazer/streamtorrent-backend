import { z } from "zod";
export declare const initUploadSchema: z.ZodObject<{
    fileName: z.ZodString;
    mimeType: z.ZodEnum<{
        "application/octet-stream": "application/octet-stream";
        "image/jpeg": "image/jpeg";
        "image/png": "image/png";
        "image/gif": "image/gif";
        "image/webp": "image/webp";
        "image/svg+xml": "image/svg+xml";
        "video/mp4": "video/mp4";
        "video/webm": "video/webm";
        "video/x-matroska": "video/x-matroska";
        "video/x-msvideo": "video/x-msvideo";
        "video/quicktime": "video/quicktime";
        "application/pdf": "application/pdf";
    }>;
    size: z.ZodNumber;
    purpose: z.ZodEnum<{
        PROFILE_PHOTO: "PROFILE_PHOTO";
        POST_ATTACHMENT: "POST_ATTACHMENT";
        DOCUMENT: "DOCUMENT";
        OTHER: "OTHER";
        TEST_FILE: "TEST_FILE";
    }>;
    checksum: z.ZodString;
}, z.core.$strip>;
export declare const confirmUploadSchema: z.ZodObject<{
    key: z.ZodString;
    checksum: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const getDownloadUrlSchema: z.ZodObject<{
    key: z.ZodString;
}, z.core.$strip>;
export type InitUploadDto = z.infer<typeof initUploadSchema>;
export type ConfirmUploadDto = z.infer<typeof confirmUploadSchema>;
export type GetDownloadUrlDto = z.infer<typeof getDownloadUrlSchema>;
//# sourceMappingURL=file.dto.d.ts.map