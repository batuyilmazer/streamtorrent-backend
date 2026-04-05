import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  serializeCollection,
  serializeStreamSession,
  serializeTorrent,
  serializeUserTorrent,
} from "./torrent.serializers.js";

describe("torrent serializers", () => {
  const baseTorrent = {
    id: "torrent_1",
    infoHash: "hash",
    name: "Example Torrent",
    magnetUri: null,
    torrentFile: null,
    size: 42n,
    fileList: [{ path: "folder/video.mkv", size: 42, index: 0 }],
    isAdminPinned: false,
    addedBy: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSeenAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  it("serializes torrent bigint sizes and json file lists", () => {
    const torrent = serializeTorrent(baseTorrent);

    assert.equal(torrent.size, "42");
    assert.deepEqual(torrent.fileList, [
      { path: "folder/video.mkv", size: 42, index: 0 },
    ]);
  });

  it("serializes nested torrent relations consistently", () => {
    const userTorrent = serializeUserTorrent({
      id: "saved_1",
      userId: "user_1",
      torrentId: "torrent_1",
      savedAt: new Date("2026-01-03T00:00:00.000Z"),
      torrent: baseTorrent,
    });

    const collection = serializeCollection({
      id: "collection_1",
      userId: "user_1",
      name: "Favorites",
      description: null,
      isPublic: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      items: [
        {
          id: "item_1",
          collectionId: "collection_1",
          torrentId: "torrent_1",
          addedAt: new Date("2026-01-03T00:00:00.000Z"),
          torrent: baseTorrent,
        },
      ],
      _count: { items: 1 },
    });

    assert.equal(userTorrent.torrent.size, "42");
    assert.equal(collection.items?.[0]?.torrent.size, "42");
    assert.equal(collection._count?.items, 1);
  });

  it("adds stream file names from the torrent paths", () => {
    const session = serializeStreamSession("token_1", [
      { path: "folder/video.mkv", size: 42, index: 0 },
    ]);

    assert.deepEqual(session, {
      streamToken: "token_1",
      files: [
        {
          path: "folder/video.mkv",
          size: 42,
          index: 0,
          name: "video.mkv",
        },
      ],
    });
  });
});
