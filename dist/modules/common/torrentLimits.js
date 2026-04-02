import { env } from "../../config/env.js";
/** Maximum allowed total torrent size in bytes (from MAX_TORRENT_SIZE_GB). */
export function maxTorrentBytes() {
    return BigInt(Math.round(env.torrent.maxSizeGb * 1e9));
}
//# sourceMappingURL=torrentLimits.js.map