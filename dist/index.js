import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import "./services/mail-service/emailWorker.js";
import server from "./server.js";
const port = env.port || 3000;
server.listen(port, () => {
    logger.info({ port }, "Server is running");
});
//# sourceMappingURL=index.js.map