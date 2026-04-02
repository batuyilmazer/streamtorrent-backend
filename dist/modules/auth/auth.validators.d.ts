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
    refreshToken: z.ZodOptional<z.ZodString>;
    deviceId: z.ZodOptional<z.ZodUUID>;
}, z.core.$strip>;
export declare const logoutSchema: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const twofaSchema: z.ZodObject<{
    scope: z.ZodEnum<{
        "verify-email": "verify-email";
        "reset-password": "reset-password";
    }>;
}, z.core.$strip>;
export declare const passwordResetSchema: z.ZodObject<{
    newPassword: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=auth.validators.d.ts.map