import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
  deviceId: z.uuid().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
  deviceId: z.uuid().optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const twofaSchema = z.object({
  scope: z.enum(["reset-password", "verify-email"]),
});

export const passwordResetSchema = z.object({
  newPassword: z.string().min(8),
});
