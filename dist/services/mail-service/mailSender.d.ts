export declare class MailSender {
    private from;
    constructor(prefix?: string);
    send(options: {
        to: string | string[];
        subject: string;
        html?: string;
        text?: string;
        replyTo?: string;
    }): Promise<import("nodemailer/lib/smtp-transport/index.js").SentMessageInfo>;
    sendPasswordResetEmail(to: string, link: string, username: string): Promise<import("nodemailer/lib/smtp-transport/index.js").SentMessageInfo>;
    sendEmailChangeEmail(to: string, link: string, username: string): Promise<import("nodemailer/lib/smtp-transport/index.js").SentMessageInfo>;
    sendVerificationEmail(to: string, link: string, username: string): Promise<import("nodemailer/lib/smtp-transport/index.js").SentMessageInfo>;
}
//# sourceMappingURL=mailSender.d.ts.map