import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { Redis } from "ioredis";
const connection = new Redis(env.redis.url, {
    maxRetriesPerRequest: null,
});
export const MAX_BULK_SIZE = 14;
export const bulkMailQueue = new Queue("bulk-mail", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true,
    },
});
/**
 * Adds bulk email jobs to the queue. Auto-chunks into groups of 14.
 */
export const addBulkEmailJob = async (templateName, subject, destinations, options = {}) => {
    const jobs = [];
    for (let i = 0; i < destinations.length; i += MAX_BULK_SIZE) {
        const chunk = destinations.slice(i, i + MAX_BULK_SIZE);
        jobs.push({
            name: "send-bulk-email",
            data: {
                templateName,
                subject,
                destinations: chunk,
                ...(options.from ? { from: options.from } : {}),
                ...(options.replyTo ? { replyTo: options.replyTo } : {}),
            },
        });
    }
    return bulkMailQueue.addBulk(jobs);
};
//# sourceMappingURL=bulkmailService.js.map