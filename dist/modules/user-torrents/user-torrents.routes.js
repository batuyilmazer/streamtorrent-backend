import { Router } from "express";
import { asyncHandler } from "../common/asyncHandler.js";
import { authGuard } from "../common/authGuard.js";
import { validateParams } from "../common/validate.js";
import { torrentIdParamsSchema } from "./user-torrents.validators.js";
import { save, remove, list } from "./user-torrents.controller.js";
const router = Router();
router.get("/", authGuard, asyncHandler(list));
router.post("/:torrentId", authGuard, validateParams(torrentIdParamsSchema), asyncHandler(save));
router.delete("/:torrentId", authGuard, validateParams(torrentIdParamsSchema), asyncHandler(remove));
export default router;
//# sourceMappingURL=user-torrents.routes.js.map