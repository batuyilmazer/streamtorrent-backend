import { Router } from "express";
import { asyncHandler } from "../common/asyncHandler.js";
import { authGuard, optionalAuthGuard } from "../common/authGuard.js";
import { validateBody, validateParams } from "../common/validate.js";
import {
  createCollectionSchema,
  updateCollectionSchema,
  addItemSchema,
  collectionIdParamsSchema,
  removeItemParamsSchema,
} from "./collections.validators.js";
import {
  create,
  list,
  getById,
  update,
  deleteCollection,
  addItem,
  removeItem,
} from "./collections.controller.js";

const router = Router();

router.post("/", authGuard, validateBody(createCollectionSchema), asyncHandler(create));
router.get("/", authGuard, asyncHandler(list));

router.get("/:id", optionalAuthGuard, validateParams(collectionIdParamsSchema), asyncHandler(getById));
router.patch("/:id", authGuard, validateParams(collectionIdParamsSchema), validateBody(updateCollectionSchema), asyncHandler(update));
router.delete("/:id", authGuard, validateParams(collectionIdParamsSchema), asyncHandler(deleteCollection));

router.post("/:id/items", authGuard, validateParams(collectionIdParamsSchema), validateBody(addItemSchema), asyncHandler(addItem));
router.delete("/:id/items/:torrentId", authGuard, validateParams(removeItemParamsSchema), asyncHandler(removeItem));

export default router;
