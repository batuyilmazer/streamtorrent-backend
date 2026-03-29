import { z } from "zod";
export declare const registerSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
    deviceId: z.ZodOptional<z.ZodUUID>;
}, z.core.$strip>;
export declare const refreshSchema: z.ZodObject<{
    refreshToken: z.ZodString;
    deviceId: z.ZodUUID;
}, z.core.$strip>;
export declare const logoutSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const twofaSchema: z.ZodObject<{
    scope: z.ZodEnum<{
        "reset-password": "reset-password";
        "verify-email": "verify-email";
    }>;
}, z.core.$strip>;
export declare const passwordResetSchema: z.ZodObject<{
    newPassword: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=auth.validators.d.ts.map