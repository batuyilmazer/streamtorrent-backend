import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
  deviceId: z.uuid().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
  deviceId: z.uuid().optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});
export type LogoutInput = z.infer<typeof logoutSchema>;

export const twofaSchema = z.object({
  scope: z.enum(["reset-password", "verify-email"]),
});
export type TwoFactorInput = z.infer<typeof twofaSchema>;

export const passwordResetSchema = z.object({
  newPassword: z.string().min(8),
});
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
