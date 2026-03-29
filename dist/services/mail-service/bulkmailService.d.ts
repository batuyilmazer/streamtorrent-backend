import { Queue } from "bullmq";
export declare const MAX_BULK_SIZE = 14;
export interface BulkEmailJob {
    templateName: string;
    subject: string;
    destinations: Array<{
        destination: string;
        templateData?: Record<string, any>;
    }>;
    from?: string;
    replyTo?: string;
}
export declare const bulkMailQueue: Queue<BulkEmailJob, any, string, BulkEmailJob, any, string>;
/**
 * Adds bulk email jobs to the queue. Auto-chunks into groups of 14.
 */
export declare const addBulkEmailJob: (templateName: string, subject: string, destinations: Array<{
    destination: string;
    templateData?: Record<string, any>;
}>, options?: {
    from?: string;
    replyTo?: string;
}) => Promise<import("bullmq").Job<BulkEmailJob, any, string>[]>;
//# sourceMappingURL=bulkmailService.d.ts.map