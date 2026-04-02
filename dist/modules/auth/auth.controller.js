import { createUser, getUserInfo, resetUserPassword, verifyUser, verifyUserEmail, } from "./users.service.js";
import { sign2faToken, signAccessToken } from "./jwt.js";
import { issueRefreshToken, verifyAndRotate, revokeActiveTokensForDevice, revokeByRaw, revokeAll, } from "./refresh.js";
import { HttpError } from "../common/errors.js";
import { MailSender } from "../../services/mail-service/mailSender.js";
import { env } from "../../config/env.js";
const REFRESH_COOKIE = "refreshToken";
const DEVICE_COOKIE = "deviceId";
function isSecureRequest(req) {
    if (req.secure)
        return true;
    const forwardedProto = req.headers["x-forwarded-proto"];
    if (typeof forwardedProto === "string") {
        return forwardedProto.split(",")[0]?.trim() === "https";
    }
    return false;
}
function cookieOptions(req) {
    return {
        httpOnly: true,
        secure: isSecureRequest(req),
        sameSite: "lax",
        path: "/",
        maxAge: env.refresh.expireDays * 24 * 60 * 60 * 1000,
    };
}
function setSessionCookiesWithReq(req, res, refreshToken, deviceId) {
    const opts = cookieOptions(req);
    res.cookie(REFRESH_COOKIE, refreshToken, opts);
    res.cookie(DEVICE_COOKIE, deviceId, opts);
}
function clearSessionCookies(req, res) {
    const opts = {
        httpOnly: true,
        secure: isSecureRequest(req),
        sameSite: "lax",
        path: "/",
    };
    res.clearCookie(REFRESH_COOKIE, opts);
    res.clearCookie(DEVICE_COOKIE, opts);
}
export const register = async (req, res) => {
    const emailRaw = req.body.email;
    const passwordRaw = req.body.password;
    const { id, email } = await createUser(emailRaw, passwordRaw);
    const accessToken = signAccessToken(id);
    const { raw, deviceId } = await issueRefreshToken(id, req.headers["user-agent"], req.ip);
    setSessionCookiesWithReq(req, res, raw, deviceId);
    res.status(201).json({
        user: { id, email },
        access: accessToken,
    });
};
export const login = async (req, res) => {
    const { email, password, deviceId } = req.body;
    const user = await verifyUser(email, password);
    const accessToken = signAccessToken(user.id);
    if (deviceId)
        await revokeActiveTokensForDevice(user.id, deviceId);
    const session = await issueRefreshToken(user.id, req.headers["user-agent"], req.ip, deviceId);
    setSessionCookiesWithReq(req, res, session.raw, session.deviceId);
    res.status(200).json({
        user: { userId: user.id, email: user.email },
        access: accessToken,
    });
};
export const refresh = async (req, res) => {
    const { refreshToken, deviceId } = (req.body ?? {});
    const refreshTokenFromCookie = req.cookies?.[REFRESH_COOKIE];
    const deviceIdFromCookie = req.cookies?.[DEVICE_COOKIE];
    const rawToken = refreshToken ?? refreshTokenFromCookie;
    const resolvedDeviceId = deviceId ?? deviceIdFromCookie;
    if (!rawToken)
        throw HttpError.badRequest("No refresh token provided.");
    if (!resolvedDeviceId)
        throw HttpError.badRequest("No deviceId provided.");
    const { userId, newRaw } = await verifyAndRotate(rawToken, resolvedDeviceId, req.headers["user-agent"], req.ip);
    const access = signAccessToken(userId);
    setSessionCookiesWithReq(req, res, newRaw, resolvedDeviceId);
    res.json({ access });
};
export const logout = async (req, res) => {
    const refreshToken = req.body?.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
        await revokeByRaw(refreshToken);
    }
    clearSessionCookies(req, res);
    res.status(200).json({ msg: "Logged out." });
};
export const logoutAll = async (req, res) => {
    const userId = req.user.id;
    await revokeAll(userId);
    clearSessionCookies(req, res);
    res.status(200).json({ msg: "Logged out from all devices." });
};
export const twofa = async (req, res) => {
    // html automatically transforms token to lowercase in link format. Should send token base64 encoded to avoid this problem.
    const userId = req.user.id;
    const user = await getUserInfo(userId);
    const { scope } = req.body;
    const twofaToken = sign2faToken(userId, scope);
    const mailer = new MailSender();
    if (scope == "change-email")
        await mailer.sendEmailChangeEmail(user.email, twofaToken, "Kullanıcı");
    else if (scope == "reset-password")
        await mailer.sendPasswordResetEmail(user.email, twofaToken, "Kullanıcı");
    else if (scope == "verify-email")
        await mailer.sendVerificationEmail(user.email, twofaToken, "Kullanıcı");
    else
        throw HttpError.internal();
    res.status(200).json({ msg: `Verification email sent to ${user.email}` });
};
export const verifyEmail = async (req, res) => {
    const userId = req.user.id;
    const verifiedUser = await verifyUserEmail(userId);
    res
        .status(200)
        .json({ msg: `Mail address ${verifiedUser.email} verified for user.` });
};
export const resetPassword = async (req, res) => {
    const userId = req.user.id;
    const { newPassword } = req.body;
    const updatedUser = await resetUserPassword(userId, newPassword);
    res
        .status(200)
        .json({ msg: `Password reset for user with email: ${updatedUser.email}` });
};
//# sourceMappingURL=auth.controller.js.map