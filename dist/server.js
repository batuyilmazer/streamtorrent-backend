import express from "express";
import cookieParser from "cookie-parser";
import { notFoundHandler, globalErrorHandler, } from "./modules/common/errorHandlers.js";
import authRouter from "./modules/auth/auth.routes.js";
import meRouter from "./modules/auth/meRoutes/me.routes.js";
import fileRouter from "./modules/files/file.routes.js";
const server = express();
server.use(express.json({ limit: "5mb" }));
server.use(cookieParser());
// Healthcheck
server.get("/", (req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
});
server.use("/auth", authRouter);
server.use("/me", meRouter);
server.use("/files", fileRouter);
server.use(notFoundHandler);
server.use(globalErrorHandler);
export default server;
//# sourceMappingURL=server.js.map