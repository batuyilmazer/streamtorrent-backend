import { createUser, getUserInfo, resetUserPassword, verifyUser, verifyUserEmail, } from "./users.service.js";
import { sign2faToken, signAccessToken } from "./jwt.js";
import { issueRefreshToken, verifyAndRotate, revokeActiveTokensForDevice, revokeByRaw, revokeAll, } from "./refresh.js";
import { HttpError } from "../common/errors.js";
import { MailSender } from "../../services/mail-service/mailSender.js";
// deviceId ve refreshToken'ı direkt response body'sinde göndererek çözeceğiz. Mobilde cookie yok.
export const register = async (req, res) => {
    const emailRaw = req.body.email;
    const passwordRaw = req.body.password;
    const { id, email } = await createUser(emailRaw, passwordRaw);
    const accessToken = signAccessToken(id);
    const { raw, deviceId } = await issueRefreshToken(id, req.headers["user-agent"], req.ip);
    res.status(201).json({
        user: { id, email },
        access: accessToken,
        session: {
            refreshToken: raw,
            deviceId,
            userAgent: req.headers["user-agent"],
            ip: req.ip,
        },
    });
};
export const login = async (req, res) => {
    const { email, password, deviceId } = req.body;
    const user = await verifyUser(email, password);
    const accessToken = signAccessToken(user.id);
    if (deviceId)
        revokeActiveTokensForDevice(user.id, deviceId);
    const session = await issueRefreshToken(user.id, req.headers["user-agent"], req.ip, deviceId);
    res.status(200).json({
        user: { userId: user.id, email: user.email },
        access: accessToken,
        session: {
            refreshToken: session.raw,
            expiresAt: session.expiresAt,
            deviceId: session.deviceId,
        },
    });
};
export const refresh = async (req, res) => {
    const { refreshToken, deviceId } = req.body;
    if (!refreshToken)
        throw HttpError.badRequest("No refresh token provided.");
    if (!deviceId)
        throw HttpError.badRequest("No deviceId provided.");
    const { userId, newRaw } = await verifyAndRotate(refreshToken, deviceId, req.headers["user-agent"], req.ip);
    const access = signAccessToken(userId);
    res.json({ newRaw, access });
};
export const logout = async (req, res) => {
    const { refreshToken } = req.body;
    await revokeByRaw(refreshToken);
    res.status(200).json({ msg: "Logged out." });
};
export const logoutAll = async (req, res) => {
    const userId = req.user.id;
    await revokeAll(userId);
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