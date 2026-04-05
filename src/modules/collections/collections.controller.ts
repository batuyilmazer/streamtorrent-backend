import type { Request, Response } from "express";
import * as collectionsService from "./collections.service.js";
import {
  readBody,
  readParams,
  requireUserId,
} from "../common/requestContext.js";
import type {
  AddCollectionItemInput,
  CollectionIdParams,
  CreateCollectionInput,
  RemoveItemParams,
  UpdateCollectionInput,
} from "./collections.validators.js";
import {
  serializeCollection,
  serializeCollectionItem,
} from "../common/torrent.serializers.js";

export async function create(req: Request, res: Response) {
  const userId = requireUserId(req);
  const collection = await collectionsService.createCollection(
    userId,
    readBody<CreateCollectionInput>(req),
  );
  res.status(201).json({ collection: serializeCollection(collection) });
}

export async function list(req: Request, res: Response) {
  const userId = requireUserId(req);
  const collections = await collectionsService.listByUser(userId);
  res.json({ collections: collections.map(serializeCollection) });
}

export async function getById(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = readParams<CollectionIdParams>(req);
  const collection = await collectionsService.getById(id, userId);
  res.json({ collection: serializeCollection(collection) });
}

export async function update(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = readParams<CollectionIdParams>(req);
  const collection = await collectionsService.updateCollection(
    id,
    userId,
    readBody<UpdateCollectionInput>(req),
  );
  res.json({ collection: serializeCollection(collection) });
}

export async function deleteCollection(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = readParams<CollectionIdParams>(req);
  await collectionsService.deleteCollection(id, userId);
  res.json({ msg: "Deleted." });
}

export async function addItem(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = readParams<CollectionIdParams>(req);
  const { torrentId } = readBody<AddCollectionItemInput>(req);
  const item = await collectionsService.addItem(id, userId, torrentId);
  res.status(201).json({ item: serializeCollectionItem(item) });
}

export async function removeItem(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id, torrentId } = readParams<RemoveItemParams>(req);
  await collectionsService.removeItem(id, userId, torrentId);
  res.json({ msg: "Removed." });
}
