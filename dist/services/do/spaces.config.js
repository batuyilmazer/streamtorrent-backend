import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
export const spacesClient = new S3Client({
    endpoint: env.spaces.endpoint,
    region: env.spaces.region,
    credentials: {
        accessKeyId: env.spaces.key,
        secretAccessKey: env.spaces.secret,
    },
    forcePathStyle: false,
});
//# sourceMappingURL=spaces.config.js.map