import express from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import {
  notFoundHandler,
  globalErrorHandler,
} from "./modules/common/errorHandlers.js";
import authRouter from "./modules/auth/auth.routes.js";
import meRouter from "./modules/auth/meRoutes/me.routes.js";
import fileRouter from "./modules/files/file.routes.js";
import torrentsRouter from "./modules/torrents/torrents.routes.js";
import {
  streamSessionRouter,
  streamVideoRouter,
} from "./modules/stream/stream.routes.js";
import userTorrentsRouter from "./modules/user-torrents/user-torrents.routes.js";
import collectionsRouter from "./modules/collections/collections.routes.js";
import { env } from "./config/env.js";

const server = express();
server.set('trust proxy', 1);

server.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || env.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

server.use(cors(corsOptions));

// CORS preflight: make sure OPTIONS requests don't fall through to 404.
server.options(/.*/, cors(corsOptions));

server.use(express.json({ limit: "5mb" }));
server.use(cookieParser());

// Healthcheck
server.get("/", (req: Request, res: Response) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

server.use("/auth", authRouter);
server.use("/me", meRouter);
server.use("/files", fileRouter);
server.use("/api/torrents", torrentsRouter);
server.use("/api/torrents", streamSessionRouter);
server.use("/api/stream", streamVideoRouter);
server.use("/api/user-torrents", userTorrentsRouter);
server.use("/api/collections", collectionsRouter);

server.use(notFoundHandler);
server.use(globalErrorHandler);

export default server;
