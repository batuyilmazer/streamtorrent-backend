import { sendEmail } from "./smtp.js";
import { env } from "../../config/env.js";
import { renderTemplate } from "./templates/template.loader.js";
export class MailSender {
    from;
    constructor(prefix) {
        this.from = prefix
            ? `${prefix} <${env.smtp.from}>`
            : env.smtp.from;
    }
    async send(options) {
        return sendEmail({ ...options, from: this.from });
    }
    async sendPasswordResetEmail(to, link, username) {
        const html = renderTemplate("password-reset", {
            USERNAME: username,
            RESET_LINK: link,
        });
        return this.send({
            to,
            subject: "Şifre Sıfırlama Talebi",
            html: `<a href="${link}">Şifre Sıfırla</a>`,
            text: `Link: ${link}`,
        });
    }
    async sendEmailChangeEmail(to, link, username) {
        const html = renderTemplate("email-change", {
            USERNAME: username,
            CONFIRM_LINK: link,
        });
        return this.send({
            to,
            subject: "Email Değiştirme Talebi",
            html: `<a href="${link}">Emailini sıfırla</a>`,
            text: `Link: ${link}`,
        });
    }
    async sendVerificationEmail(to, link, username) {
        const html = renderTemplate("verify-email", {
            USERNAME: username,
            VERIFY_LINK: link,
        });
        return this.send({
            to,
            subject: "Hesap Doğrulama",
            html,
            text: `Link: ${link}`,
        });
    }
}
//# sourceMappingURL=mailSender.js.map