import type { Request, Response } from "express";
import {
  createUser,
  getUserInfo,
  resetUserPassword,
  verifyUser,
  verifyUserEmail,
} from "./users.service.js";
import { sign2faToken, signAccessToken } from "./jwt.js";
import {
  issueRefreshToken,
  verifyAndRotate,
  revokeActiveTokensForDevice,
  revokeByRaw,
  revokeAll,
} from "./refresh.js";
import { HttpError } from "../common/errors.js";
import { MailSender } from "../../services/mail-service/mailSender.js";
import { readBody, requireUserId } from "../common/requestContext.js";
import {
  clearSessionCookies,
  readDeviceId,
  readRefreshToken,
  setSessionCookies,
} from "./sessionCookies.js";
import type {
  LoginInput,
  PasswordResetInput,
  RefreshInput,
  RegisterInput,
  TwoFactorInput,
} from "./auth.validators.js";

export const register = async (req: Request, res: Response) => {
  const { email: emailRaw, password: passwordRaw } = readBody<RegisterInput>(req);
  const { id, email } = await createUser(emailRaw, passwordRaw);
  const accessToken = signAccessToken(id);
  const { raw, deviceId } = await issueRefreshToken(
    id,
    req.headers["user-agent"],
    req.ip
  );
  setSessionCookies(req, res, raw, deviceId);
  res.status(201).json({
    user: { id, email },
    access: accessToken,
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password, deviceId } = readBody<LoginInput>(req);
  const user = await verifyUser(email, password);
  const accessToken = signAccessToken(user.id);
  if (deviceId) await revokeActiveTokensForDevice(user.id, deviceId);
  const session = await issueRefreshToken(
    user.id,
    req.headers["user-agent"],
    req.ip,
    deviceId
  );
  setSessionCookies(req, res, session.raw, session.deviceId);

  res.status(200).json({
    user: { userId: user.id, email: user.email },
    access: accessToken,
  });
};

export const refresh = async (req: Request, res: Response) => {
  readBody<RefreshInput | undefined>(req);
  const rawToken = readRefreshToken(req);
  const resolvedDeviceId = readDeviceId(req);
  if (!rawToken) throw HttpError.badRequest("No refresh token provided.");
  if (!resolvedDeviceId) throw HttpError.badRequest("No deviceId provided.");
  const { userId, newRaw } = await verifyAndRotate(
    rawToken,
    resolvedDeviceId,
    req.headers["user-agent"] as string,
    req.ip
  );
  const access = signAccessToken(userId);
  setSessionCookies(req, res, newRaw, resolvedDeviceId);
  res.json({ access });
};

export const logout = async (req: Request, res: Response) => {
  readBody<RefreshInput | undefined>(req);
  const refreshToken = readRefreshToken(req);
  if (refreshToken) {
    await revokeByRaw(refreshToken);
  }
  clearSessionCookies(req, res);
  res.status(200).json({ msg: "Logged out." });
};

export const logoutAll = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  await revokeAll(userId);
  clearSessionCookies(req, res);
  res.status(200).json({ msg: "Logged out from all devices." });
};

export const twofa = async (req: Request, res: Response) => {
  // html automatically transforms token to lowercase in link format. Should send token base64 encoded to avoid this problem.
  const userId = requireUserId(req);
  const user = await getUserInfo(userId);
  const { scope } = readBody<TwoFactorInput>(req);
  const twofaToken = sign2faToken(userId, scope);
  const mailer = new MailSender();
  if (scope === "reset-password")
    await mailer.sendPasswordResetEmail(user.email, twofaToken, "Kullanıcı");
  else if (scope === "verify-email")
    await mailer.sendVerificationEmail(user.email, twofaToken, "Kullanıcı");
  else throw HttpError.internal();
  res.status(200).json({ msg: `Verification email sent to ${user.email}` });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const verifiedUser = await verifyUserEmail(userId);
  res
    .status(200)
    .json({ msg: `Mail address ${verifiedUser.email} verified for user.` });
};

export const resetPassword = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { newPassword } = readBody<PasswordResetInput>(req);
  const updatedUser = await resetUserPassword(userId, newPassword);
  res
    .status(200)
    .json({ msg: `Password reset for user with email: ${updatedUser.email}` });
};
