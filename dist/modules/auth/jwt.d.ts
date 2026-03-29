type AccessPayload = {
    sub: string;
    iat?: number;
    exp?: number;
};
type TwoFactorPayload = {
    sub: string;
    scope: string;
    iat?: number;
    exp: number;
};
export declare const signAccessToken: (userId: string) => string;
export declare function verifyAccessToken(token: string): AccessPayload;
export declare const sign2faToken: (userId: string, scope: string) => string;
export declare const verify2faToken: (token: string) => TwoFactorPayload;
export {};
//# sourceMappingURL=jwt.d.ts.map