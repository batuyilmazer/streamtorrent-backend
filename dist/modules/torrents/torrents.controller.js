import { HttpError } from "../common/errors.js";
import { env } from "../../config/env.js";
import { maxTorrentBytes } from "../common/torrentLimits.js";
import { getTorrentById, parseMagnetString, parseTorrentBuffer, upsertTorrent, } from "./torrents.service.js";
function serializeTorrent(torrent) {
    return {
        ...torrent,
        size: torrent.size !== undefined ? String(torrent.size) : torrent.size,
    };
}
export async function upload(req, res) {
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw HttpError.badRequest("No torrent file provided.");
    }
    const data = await parseTorrentBuffer(buffer);
    const maxBytes = maxTorrentBytes();
    if (data.size > maxBytes) {
        throw HttpError.badRequest(`Torrent exceeds the ${env.torrent.maxSizeGb} GB size limit.`);
    }
    const torrent = await upsertTorrent(data);
    res.status(201).json({ torrent: serializeTorrent(torrent) });
}
export async function magnet(req, res) {
    const { magnetUri } = req.body;
    const data = await parseMagnetString(magnetUri);
    const torrent = await upsertTorrent(data);
    res.status(201).json({ torrent: serializeTorrent(torrent) });
}
export async function getById(req, res) {
    const id = req.params.id;
    const torrent = await getTorrentById(id);
    res.json({ torrent: serializeTorrent(torrent) });
}
//# sourceMappingURL=torrents.controller.js.map