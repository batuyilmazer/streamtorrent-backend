import * as userTorrentsService from "./user-torrents.service.js";
function serializeTorrent(obj) {
    return {
        ...obj,
        size: obj.size !== undefined ? String(obj.size) : obj.size,
    };
}
function serializeUserTorrent(ut) {
    const result = { ...ut };
    if (result.torrent) {
        result.torrent = serializeTorrent(result.torrent);
    }
    return result;
}
export async function save(req, res) {
    const userId = req.user.id;
    const torrentId = req.params.torrentId;
    const userTorrent = await userTorrentsService.saveTorrent(userId, torrentId);
    res.status(201).json({ userTorrent: serializeUserTorrent(userTorrent) });
}
export async function remove(req, res) {
    const userId = req.user.id;
    const torrentId = req.params.torrentId;
    await userTorrentsService.removeTorrent(userId, torrentId);
    res.json({ msg: "Removed." });
}
export async function list(req, res) {
    const userId = req.user.id;
    const items = await userTorrentsService.listByUser(userId);
    res.json({
        userTorrents: items.map((ut) => serializeUserTorrent(ut)),
    });
}
//# sourceMappingURL=user-torrents.controller.js.map