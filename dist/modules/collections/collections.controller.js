import * as collectionsService from "./collections.service.js";
function serializeTorrent(obj) {
    return {
        ...obj,
        size: obj.size !== undefined ? String(obj.size) : obj.size,
    };
}
function serializeItem(item) {
    const result = { ...item };
    if (result.torrent) {
        result.torrent = serializeTorrent(result.torrent);
    }
    return result;
}
function serializeCollection(collection) {
    const result = { ...collection };
    if (Array.isArray(result.items)) {
        result.items = result.items.map(serializeItem);
    }
    return result;
}
export async function create(req, res) {
    const userId = req.user.id;
    const collection = await collectionsService.createCollection(userId, req.body);
    res.status(201).json({ collection });
}
export async function list(req, res) {
    const userId = req.user.id;
    const collections = await collectionsService.listByUser(userId);
    res.json({ collections });
}
export async function getById(req, res) {
    const userId = req.user?.id;
    const id = req.params.id;
    const collection = await collectionsService.getById(id, userId);
    res.json({ collection: serializeCollection(collection) });
}
export async function update(req, res) {
    const userId = req.user.id;
    const id = req.params.id;
    const collection = await collectionsService.updateCollection(id, userId, req.body);
    res.json({ collection });
}
export async function deleteCollection(req, res) {
    const userId = req.user.id;
    const id = req.params.id;
    await collectionsService.deleteCollection(id, userId);
    res.json({ msg: "Deleted." });
}
export async function addItem(req, res) {
    const userId = req.user.id;
    const id = req.params.id;
    const item = await collectionsService.addItem(id, userId, req.body.torrentId);
    res.status(201).json({ item: serializeItem(item) });
}
export async function removeItem(req, res) {
    const userId = req.user.id;
    const id = req.params.id;
    const torrentId = req.params.torrentId;
    await collectionsService.removeItem(id, userId, torrentId);
    res.json({ msg: "Removed." });
}
//# sourceMappingURL=collections.controller.js.map