import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
export const signAccessToken = (userId) => {
    return jwt.sign({ sub: userId }, env.jwt.secret, {
        expiresIn: `${env.jwt.accessExpiresMin}m`,
    });
};
export function verifyAccessToken(token) {
    return jwt.verify(token, env.jwt.secret);
}
export const sign2faToken = (userId, scope) => {
    return jwt.sign({ sub: userId, scope }, env.jwt.secret, {
        expiresIn: `${env.jwt.twoFactorExpiresMin}m`,
    });
};
export const verify2faToken = (token) => {
    return jwt.verify(token, env.jwt.secret);
};
//# sourceMappingURL=jwt.js.map