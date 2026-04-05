import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import server from "../../server.js";
import { prisma } from "../../config/db.js";
import { type ApiErrorResponseDto } from "../common/api-error.dto.js";
import { mintStreamToken } from "./stream.service.js";
import { torrentEngine } from "../../services/torrent/torrentEngine.js";
import { startHttpTestServer } from "../../test/httpTestServer.js";
import { restoreStubbedMethods, stubMethod } from "../../test/stubMethod.js";

interface TorrentFileRecord {
  path: string;
  size: number;
  index: number;
}

interface TorrentRecord {
  id: string;
  infoHash: string;
  name: string;
  magnetUri: string | null;
  torrentFile: Buffer | null;
  size: bigint;
  fileList: TorrentFileRecord[];
  isAdminPinned: boolean;
  addedBy: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

interface FakeTorrentFile {
  name: string;
  length: number;
  path: string;
  select: () => void;
  createReadStream: (options?: { start?: number; end?: number }) => Readable;
}

function makeTorrentRecord(overrides: Partial<TorrentRecord> = {}): TorrentRecord {
  return {
    id: "torrent_1",
    infoHash: "infohash-1",
    name: "Example Torrent",
    magnetUri: "magnet:?xt=urn:btih:infohash-1",
    torrentFile: null,
    size: 1024n,
    fileList: [
      {
        path: "video.mp4",
        size: 1024,
        index: 0,
      },
    ],
    isAdminPinned: false,
    addedBy: null,
    createdAt: new Date(),
    lastSeenAt: new Date(),
    ...overrides,
  };
}

function makeReadableFile(name: string, content: Buffer): FakeTorrentFile {
  return {
    name,
    path: name,
    length: content.length,
    select: () => {},
    createReadStream: (options) => {
      const start = options?.start ?? 0;
      const end = options?.end ?? content.length - 1;
      return Readable.from(content.subarray(start, end + 1));
    },
  };
}

function installTorrentMocks(
  torrent: TorrentRecord,
  options: {
    file?: FakeTorrentFile;
    handle?: {
      torrent: {
        name: string;
        length: number;
        files: Array<{ path: string; length: number }>;
      };
    };
  } = {},
) {
  const updates: Array<{ where: { id: string }; data: Partial<TorrentRecord> }> = [];
  const fallbackHandle = {
    torrent: {
      name: torrent.name,
      length: Number(torrent.size),
      files: torrent.fileList.map((file) => ({
        path: file.path,
        length: file.size,
      })),
    },
  };

  stubMethod(prisma.torrent as any, "findUnique", async (args: any) => {
    return args.where.id === torrent.id ? { ...torrent } : null;
  });
  stubMethod(prisma.torrent as any, "update", async (args: any) => {
    if (args.where.id !== torrent.id) throw new Error(`Torrent ${args.where.id} not found.`);
    updates.push(args as { where: { id: string }; data: Partial<TorrentRecord> });
    Object.assign(torrent, args.data as Partial<TorrentRecord>, { lastSeenAt: new Date() });
    return { ...torrent };
  });
  stubMethod(torrentEngine as any, "getOrAdd", async () => {
    const handle = options.handle ?? fallbackHandle;
    return {
      infoHash: torrent.infoHash,
      lastAccessedAt: Date.now(),
      torrent: handle.torrent,
    } as any;
  });
  stubMethod(torrentEngine as any, "waitForPeers", async () => {});
  stubMethod(torrentEngine as any, "getFile", () => {
    if (!options.file) {
      throw new Error("No stream file configured for this test.");
    }
    return options.file as any;
  });

  return { updates };
}

afterEach(() => {
  restoreStubbedMethods();
});

describe("stream integration", () => {
  it("returns a stream session for torrents with persisted metadata", async () => {
    const torrent = makeTorrentRecord();
    installTorrentMocks(torrent);
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await fetch(`${httpServer.baseUrl}/api/torrents/${torrent.id}/stream`);
      const body = (await response.json()) as {
        streamToken: string;
        files: TorrentFileRecord[];
      };

      assert.equal(response.status, 200);
      assert.ok(body.streamToken);
      assert.deepEqual(body.files, [
        {
          ...torrent.fileList[0],
          name: "video.mp4",
        },
      ]);
    } finally {
      await httpServer.close();
    }
  });

  it("resolves metadata for magnet-only torrents before returning a session", async () => {
    const torrent = makeTorrentRecord({
      fileList: [],
      size: 0n,
      name: "Magnet Only",
    });
    const { updates } = installTorrentMocks(torrent, {
      handle: {
        torrent: {
          name: "Resolved Torrent",
          length: 2048,
          files: [
            {
              path: "resolved/video.mp4",
              length: 2048,
            },
          ],
        },
      },
    });
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await fetch(`${httpServer.baseUrl}/api/torrents/${torrent.id}/stream`);
      const body = (await response.json()) as {
        streamToken: string;
        files: TorrentFileRecord[];
      };

      assert.equal(response.status, 200);
      assert.equal(body.files.length, 1);
      assert.deepEqual(body.files[0], {
        path: "resolved/video.mp4",
        size: 2048,
        index: 0,
        name: "video.mp4",
      });
      assert.equal(updates.length, 1);
      assert.deepEqual(torrent.fileList, [
        {
          path: "resolved/video.mp4",
          size: 2048,
          index: 0,
        },
      ]);
    } finally {
      await httpServer.close();
    }
  });

  it("streams a small file without a range header", async () => {
    const content = Buffer.from("stream-body");
    const torrent = makeTorrentRecord({
      fileList: [
        {
          path: "video.mp4",
          size: content.length,
          index: 0,
        },
      ],
    });
    installTorrentMocks(torrent, {
      file: makeReadableFile("video.mp4", content),
    });
    const token = mintStreamToken(torrent.id, torrent.infoHash);
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await fetch(`${httpServer.baseUrl}/api/stream/${token}/0`);
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "video/mp4");
      assert.equal(response.headers.get("accept-ranges"), "bytes");
      assert.equal(response.headers.get("content-length"), String(content.length));
      assert.equal(body, "stream-body");
    } finally {
      await httpServer.close();
    }
  });

  it("caps the first response chunk when a large file is requested without a range header", async () => {
    const largeFile = Buffer.alloc(10 * 1024 * 1024 + 5, 97);
    const torrent = makeTorrentRecord({
      fileList: [
        {
          path: "movie.mp4",
          size: largeFile.length,
          index: 0,
        },
      ],
    });
    installTorrentMocks(torrent, {
      file: makeReadableFile("movie.mp4", largeFile),
    });
    const token = mintStreamToken(torrent.id, torrent.infoHash);
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await fetch(`${httpServer.baseUrl}/api/stream/${token}/0`);
      const bytes = new Uint8Array(await response.arrayBuffer());

      assert.equal(response.status, 206);
      assert.equal(response.headers.get("accept-ranges"), "bytes");
      assert.equal(response.headers.get("content-length"), String(10 * 1024 * 1024));
      assert.equal(
        response.headers.get("content-range"),
        `bytes 0-${10 * 1024 * 1024 - 1}/${largeFile.length}`,
      );
      assert.equal(bytes.length, 10 * 1024 * 1024);
    } finally {
      await httpServer.close();
    }
  });

  it("returns the shared bad-request contract for invalid range headers", async () => {
    const content = Buffer.from("stream-body");
    const torrent = makeTorrentRecord({
      fileList: [
        {
          path: "video.mp4",
          size: content.length,
          index: 0,
        },
      ],
    });
    installTorrentMocks(torrent, {
      file: makeReadableFile("video.mp4", content),
    });
    const token = mintStreamToken(torrent.id, torrent.infoHash);
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await fetch(`${httpServer.baseUrl}/api/stream/${token}/0`, {
        headers: {
          Range: "not-a-range",
        },
      });
      const body = (await response.json()) as ApiErrorResponseDto;

      assert.equal(response.status, 400);
      assert.deepEqual(body, {
        error: "BAD_REQUEST",
        message: "Invalid Range header.",
      });
    } finally {
      await httpServer.close();
    }
  });

  it("returns the shared bad-request contract for out-of-range file indexes", async () => {
    const torrent = makeTorrentRecord();
    installTorrentMocks(torrent);
    const token = mintStreamToken(torrent.id, torrent.infoHash);
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await fetch(`${httpServer.baseUrl}/api/stream/${token}/3`);
      const body = (await response.json()) as ApiErrorResponseDto;

      assert.equal(response.status, 400);
      assert.deepEqual(body, {
        error: "BAD_REQUEST",
        message: "Invalid fileIndex. Torrent has 1 file(s).",
      });
    } finally {
      await httpServer.close();
    }
  });

  it("returns the shared unauthorized contract for invalid stream tokens", async () => {
    const torrent = makeTorrentRecord();
    installTorrentMocks(torrent);
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await fetch(`${httpServer.baseUrl}/api/stream/not-a-valid-token/0`);
      const body = (await response.json()) as ApiErrorResponseDto;

      assert.equal(response.status, 401);
      assert.deepEqual(body, {
        error: "UNAUTHORIZED",
        message: "Invalid or expired stream token.",
      });
    } finally {
      await httpServer.close();
    }
  });

  it("returns a bad request when stream metadata has not been resolved yet", async () => {
    const torrent = makeTorrentRecord({
      fileList: [],
    });
    installTorrentMocks(torrent);
    const token = mintStreamToken(torrent.id, torrent.infoHash);
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await fetch(`${httpServer.baseUrl}/api/stream/${token}/0`);
      const body = (await response.json()) as ApiErrorResponseDto;

      assert.equal(response.status, 400);
      assert.deepEqual(body, {
        error: "BAD_REQUEST",
        message: "Torrent metadata is not ready yet. Request a stream session first to resolve the file list.",
      });
    } finally {
      await httpServer.close();
    }
  });
});
