import { Worker, Job, UnrecoverableError } from "bullmq";
import { env } from "../../config/env.js";
import { Redis as IORedis } from "ioredis";
import { addBulkEmailJob } from "./bulkmailService.js";
import { sendEmail } from "./smtp.js";
import { renderTemplate } from "./templates/template.loader.js";
const connection = new IORedis(env.redis.url, {
    maxRetriesPerRequest: null,
});
const SMTP_ERROR_CATEGORIES = {
    // Yeniden denenebilir (Requeue)
    RETRYABLE: [
        "ECONNRESET",
        "ETIMEDOUT",
        "ECONNREFUSED",
        "ESOCKET",
        "ECONNECTION",
    ],
    // Kullanıcıyı kara listeye al (Blacklist)
    BLACKLIST: [
        "EENVELOPE", // Bad recipient address
        "EMESSAGE", // Message content rejected
    ],
    // Kod/Sistem hatası (Fatal - Kuyruğu durdur veya logla)
    FATAL: [
        "EAUTH", // Authentication failure
        "ENOTSUPP", // Feature not supported
    ],
};
function getErrorCategory(errorName) {
    if (SMTP_ERROR_CATEGORIES.RETRYABLE.includes(errorName))
        return "RETRYABLE";
    if (SMTP_ERROR_CATEGORIES.BLACKLIST.includes(errorName))
        return "BLACKLIST";
    if (SMTP_ERROR_CATEGORIES.FATAL.includes(errorName))
        return "FATAL";
    return "UNKNOWN";
}
export const emailWorker = new Worker("bulk-mail", async (job) => {
    const { templateName, subject, destinations, from, replyTo } = job.data;
    const retryDestinations = [];
    // Process all destinations in the batch concurrently
    await Promise.all(destinations.map(async (d) => {
        try {
            // 1. Render locally
            const html = renderTemplate(templateName, d.templateData || {});
            // 2. Send Email
            await sendEmail({
                to: d.destination,
                subject,
                html,
                from: from || env.smtp.from,
                ...(replyTo ? { replyTo } : {}),
            });
            console.log(`Email sent to ${d.destination}`);
        }
        catch (error) {
            console.error(`Failed to send to ${d.destination}:`, error);
            // Error handling logic
            const errorName = error.name || error.code || "Unknown";
            const category = getErrorCategory(errorName);
            if (category === "RETRYABLE") {
                retryDestinations.push(d);
            }
            else if (category === "BLACKLIST") {
                console.error(`Email to ${d.destination} failed with BLACKLIST error: ${errorName}`);
            }
            else if (category === "FATAL") {
                console.error(`Email to ${d.destination} failed with FATAL error: ${errorName}`);
            }
            else {
                // Unknown -> Alert Admin
                console.error(`Email to ${d.destination} failed with UNKNOWN error: ${errorName}`);
                if (env.admin?.email) {
                    await sendEmail({
                        to: env.admin.email,
                        subject: `System Error: Sending ${templateName} Email Error (${errorName})`,
                        html: `<p>An ${category} error occurred while sending email to <strong>${d.destination}</strong>.</p>
                       <p><strong>Error Type:</strong> ${errorName}</p>
                       <p><strong>Original Error:</strong> ${JSON.stringify(error)}</p>`,
                        from: from || env.smtp.from,
                    });
                }
            }
        }
    }));
    if (retryDestinations.length > 0) {
        await addBulkEmailJob(templateName, subject, retryDestinations, {
            ...(from ? { from } : {}),
            ...(replyTo ? { replyTo } : {}),
        });
        console.log(`Re-queued ${retryDestinations.length} emails.`);
    }
}, {
    connection,
    limiter: {
        max: 1,
        duration: 1000,
    },
    concurrency: 1,
});
emailWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
});
emailWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
});
//# sourceMappingURL=emailWorker.js.map