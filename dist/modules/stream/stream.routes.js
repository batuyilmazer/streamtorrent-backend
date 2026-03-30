import { Router } from "express";
import { getStreamSession, streamFile } from "./stream.controller.js";
// Mounted at /api/torrents — handles GET /:id/stream
export const streamSessionRouter = Router({ mergeParams: true });
streamSessionRouter.get("/:id/stream", getStreamSession);
// Mounted at /api/stream — handles GET /:streamToken/:fileIndex
export const streamVideoRouter = Router();
streamVideoRouter.get("/:streamToken/:fileIndex", streamFile);
//# sourceMappingURL=stream.routes.js.map