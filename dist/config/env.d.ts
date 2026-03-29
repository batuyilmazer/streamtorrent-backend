export declare const env: {
    port: number;
    jwt: {
        secret: string;
        accessExpiresMin: number;
        twoFactorExpiresMin: number;
    };
    refresh: {
        expireDays: number;
    };
    spaces: {
        key: string;
        secret: string;
        endpoint: string;
        region: string;
        bucket: string;
        cdnEndpoint: string | undefined;
    };
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
        secure: boolean;
    };
    redis: {
        url: string;
    };
    admin: {
        email: string;
        password: string;
    };
};
//# sourceMappingURL=env.d.ts.map