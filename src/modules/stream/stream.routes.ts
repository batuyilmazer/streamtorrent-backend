import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getStreamSession, streamFile } from "./stream.controller.js";

const streamSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many stream sessions, please try again later." },
});

const streamVideoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many stream requests, please try again later." },
});

// Mounted at /api/torrents — handles GET /:id/stream
export const streamSessionRouter = Router({ mergeParams: true });
streamSessionRouter.get("/:id/stream", streamSessionLimiter, getStreamSession);

// Mounted at /api/stream — handles GET /:streamToken/:fileIndex
export const streamVideoRouter = Router();
streamVideoRouter.get("/:streamToken/:fileIndex", streamVideoLimiter, streamFile);
