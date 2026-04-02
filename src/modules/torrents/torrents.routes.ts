import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../common/asyncHandler.js";
import { validateBody } from "../common/validate.js";
import { getById, magnet, upload } from "./torrents.controller.js";
import { magnetSchema } from "./torrents.validators.js";

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads, please try again later." },
});

const torrentGetByIdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

router.post(
  "/upload",
  uploadLimiter,
  express.raw({ type: "application/octet-stream", limit: "10mb" }),
  asyncHandler(upload),
);

router.post(
  "/magnet",
  uploadLimiter,
  validateBody(magnetSchema),
  asyncHandler(magnet),
);

router.get("/:id", torrentGetByIdLimiter, asyncHandler(getById));

export default router;
