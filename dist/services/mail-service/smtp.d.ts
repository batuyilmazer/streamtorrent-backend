export interface SendEmailParams {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
}
export declare function sendEmail(params: SendEmailParams): Promise<import("nodemailer/lib/smtp-transport/index.js").SentMessageInfo>;
//# sourceMappingURL=smtp.d.ts.map