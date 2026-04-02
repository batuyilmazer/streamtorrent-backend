import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody } from "../common/validate.js";
import {
  loginSchema,
  passwordResetSchema,
  registerSchema,
  twofaSchema,
} from "./auth.validators.js";
import { asyncHandler } from "../common/asyncHandler.js";
import {
  login,
  logout,
  logoutAll,
  refresh,
  register,
  resetPassword,
  twofa,
  verifyEmail,
} from "./auth.controller.js";
import { authGuard, twoFactorAuthGuard } from "../common/authGuard.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refresh attempts, please try again later." },
});

router.post("/register", validateBody(registerSchema), asyncHandler(register));

router.post("/login", loginLimiter, validateBody(loginSchema), asyncHandler(login));

router.post("/logout", asyncHandler(logout));

router.post("/logout-all", authGuard, asyncHandler(logoutAll));

router.post("/refresh", refreshLimiter, asyncHandler(refresh));

router.post("/2fa", authGuard, validateBody(twofaSchema), asyncHandler(twofa));

router.post(
  "/verify-email",
  authGuard,
  twoFactorAuthGuard("verify-email"),
  asyncHandler(verifyEmail)
);

router.post(
  "/reset-password",
  authGuard,
  twoFactorAuthGuard("reset-password"),
  validateBody(passwordResetSchema),
  asyncHandler(resetPassword)
);

export default router;
