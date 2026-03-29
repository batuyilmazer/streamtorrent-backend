import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

export interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export async function sendEmail(params: SendEmailParams) {
  return transporter.sendMail({
    from: params.from,
    to: Array.isArray(params.to) ? params.to.join(",") : params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
  });
}
