import parseTorrent from "parse-torrent";
import path from "path";
import { prisma } from "../../config/db.js";
import { HttpError } from "../common/errors.js";
function torrentTotalLengthToBigInt(value) {
    if (typeof value === "bigint")
        return value;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return BigInt(Math.trunc(value));
    }
    if (typeof value === "string" && /^[0-9]+$/.test(value)) {
        return BigInt(value);
    }
    return 0n;
}
export async function parseTorrentBuffer(buffer) {
    let parsed;
    try {
        parsed = await parseTorrent(buffer);
    }
    catch {
        throw HttpError.badRequest("Invalid .torrent file.");
    }
    if (!parsed?.infoHash)
        throw HttpError.badRequest("Invalid .torrent file.");
    const fileList = (parsed.files ?? []).map((f, i) => {
        const rawPath = f.path ?? f.name ?? `file_${i}`;
        // Normalize and reject any path containing traversal sequences.
        const normalized = path.posix.normalize(rawPath).replace(/\\/g, "/");
        if (normalized.startsWith("..") || normalized.startsWith("/")) {
            throw HttpError.badRequest("Torrent contains invalid file paths.");
        }
        return { path: normalized, size: Number(f.length ?? 0), index: i };
    });
    return {
        infoHash: parsed.infoHash,
        name: parsed.name ?? "Unknown",
        size: torrentTotalLengthToBigInt(parsed.length),
        fileList,
        torrentFile: buffer,
    };
}
export async function parseMagnetString(magnetUri) {
    let parsed;
    try {
        parsed = await parseTorrent(magnetUri);
    }
    catch {
        throw HttpError.badRequest("Invalid magnet URI.");
    }
    if (!parsed?.infoHash)
        throw HttpError.badRequest("Invalid magnet URI.");
    return {
        infoHash: parsed.infoHash,
        name: parsed.name ?? "Unknown",
        size: BigInt(0),
        fileList: [],
        magnetUri,
    };
}
export async function upsertTorrent(data) {
    return prisma.torrent.upsert({
        where: { infoHash: data.infoHash },
        update: {
            lastSeenAt: new Date(),
            // Overwrite with richer data when re-uploading a .torrent file over a
            // previously magnet-only record (which has an empty fileList).
            ...("fileList" in data && data.fileList.length > 0
                ? { name: data.name, fileList: data.fileList }
                : {}),
            ...("torrentFile" in data && data.torrentFile
                ? { torrentFile: data.torrentFile }
                : {}),
        },
        create: {
            infoHash: data.infoHash,
            name: data.name,
            magnetUri: "magnetUri" in data ? (data.magnetUri ?? null) : null,
            torrentFile: "torrentFile" in data ? (data.torrentFile ?? null) : null,
            size: data.size,
            fileList: data.fileList,
        },
    });
}
export async function getTorrentById(id) {
    const torrent = await prisma.torrent.findUnique({ where: { id } });
    if (!torrent)
        throw HttpError.notFound("Torrent not found.");
    return torrent;
}
//# sourceMappingURL=torrents.service.js.map