import express from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import {
  notFoundHandler,
  globalErrorHandler,
} from "./modules/common/errorHandlers.js";
import authRouter from "./modules/auth/auth.routes.js";
import meRouter from "./modules/auth/meRoutes/me.routes.js";
import fileRouter from "./modules/files/file.routes.js";

const server = express();

const allowedOrigins = [
  "https://film.bira.pizza",
  "https://streamtorrent-backend-43c4i.ondigitalocean.app",
];

server.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

server.use(express.json({ limit: "5mb" }));
server.use(cookieParser());

// Healthcheck
server.get("/", (req: Request, res: Response) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

server.use("/auth", authRouter);
server.use("/me", meRouter);
server.use("/files", fileRouter);

server.use(notFoundHandler);
server.use(globalErrorHandler);

export default server;
