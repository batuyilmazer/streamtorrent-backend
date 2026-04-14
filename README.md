# StreamTorrent Backend

Node.js + Express API that powers the StreamTorrent platform. Accepts `.torrent` files or magnet URIs, manages torrent lifecycle via an in-memory WebTorrent engine, and streams video content to the browser with HTTP Range support and on-the-fly FFmpeg remuxing.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Torrent Module](#torrent-module)
  - [Upload Flow](#upload-flow)
  - [Magnet Flow](#magnet-flow)
  - [Metadata Parsing](#metadata-parsing)
  - [Database Model](#database-model)
- [TorrentEngine Service](#torrentengine-service)
  - [Singleton Lifecycle](#singleton-lifecycle)
  - [Torrent Activation](#torrent-activation)
  - [Peer Discovery](#peer-discovery)
  - [Idle Cleanup](#idle-cleanup)
  - [Concurrency & Limits](#concurrency--limits)
- [Stream Module](#stream-module)
  - [Stream Session Flow](#stream-session-flow)
  - [Token Security](#token-security)
  - [Video Delivery Pipeline](#video-delivery-pipeline)
  - [Range Request Handling](#range-request-handling)
  - [FFmpeg Remuxing](#ffmpeg-remuxing)
- [End-to-End Request Flow](#end-to-end-request-flow)
- [Rate Limiting](#rate-limiting)
- [Running Locally](#running-locally)

---

## Architecture Overview

The backend has three main layers that work together to turn a torrent into a streamable video:

```mermaid
graph LR
    subgraph Client
        A[Browser / Video Player]
    end

    subgraph Express API
        B[Torrent Module]
        C[Stream Module]
    end

    subgraph Services
        D[TorrentEngine]
        E[FFmpeg Remuxer]
    end

    subgraph Storage
        F[(PostgreSQL)]
        G[BitTorrent Swarm]
    end

    A -- .torrent / magnet --> B
    B -- parse & upsert --> F
    A -- stream session --> C
    C -- mint token --> A
    A -- video request --> C
    C -- getOrAdd --> D
    D -- peer protocol --> G
    D -- file stream --> C
    C -- remux if needed --> E
    E -- mp4 pipe --> A
    C -- direct pipe --> A
```

| Layer | Responsibility |
|---|---|
| **Torrent Module** | Accepts user input (`.torrent` file or magnet URI), parses metadata, persists to DB |
| **TorrentEngine** | Stateful singleton managing live WebTorrent instances, peer connections, file access |
| **Stream Module** | Mints short-lived stream tokens, resolves files, pipes video bytes to the client |

---

## Torrent Module

**Location:** `src/modules/torrents/`

Handles ingestion of torrent metadata — no streaming or peer connections happen at this stage.

### Upload Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as POST /api/torrents/upload
    participant Parser as parseTorrentBuffer()
    participant DB as PostgreSQL

    Client->>API: Raw .torrent bytes (octet-stream)
    API->>Parser: Parse binary with parse-torrent
    Parser-->>API: { infoHash, name, size, fileList }

    alt size > MAX_TORRENT_SIZE_GB
        API-->>Client: 400 "Exceeds size limit"
    else
        API->>DB: Upsert by infoHash
        DB-->>API: Torrent record
        API-->>Client: 201 { torrent }
    end
```

**Key details:**

- The raw `.torrent` binary is stored in the DB (`torrentFile` column, `Bytes` type) so the engine can use it later for faster peer discovery compared to magnet-only records.
- `fileList` is extracted at parse time: an array of `{ path, size, index }` objects stored as JSON.
- Path traversal attacks are prevented: every file path is normalized and rejected if it contains `..` or starts with `/`.
- Upsert semantics: re-uploading a `.torrent` for an existing `infoHash` overwrites `name`, `fileList`, and `torrentFile` only if the new data is richer (e.g., replacing a magnet-only record).

### Magnet Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as POST /api/torrents/magnet
    participant Parser as parseMagnetString()
    participant DB as PostgreSQL

    Client->>API: { magnetUri }
    API->>Parser: Parse with parse-torrent
    Parser-->>API: { infoHash, name }
    Note right of Parser: size=0, fileList=[] (metadata not yet resolved)
    API->>DB: Upsert by infoHash
    DB-->>API: Torrent record
    API-->>Client: 201 { torrent }
```

**Key difference from upload:** Magnet URIs carry only the `infoHash` and optionally a display name. The actual file list and size are unknown until the engine connects to peers and downloads the torrent metadata. This resolution happens lazily when a stream session is requested.

### Metadata Parsing

Both flows use the `parse-torrent` library which handles:

| Input | Extracted Fields |
|---|---|
| `.torrent` binary | `infoHash`, `name`, `size`, `files[]` (path + size per file) |
| Magnet URI | `infoHash`, `name` (from `dn=` param), no files or size |

The `torrentTotalLengthToBigInt()` helper safely converts the total size from various types (`number`, `bigint`, `string`) into a PostgreSQL-compatible `BigInt`.

### Database Model

```mermaid
erDiagram
    Torrent {
        String id PK "cuid()"
        String infoHash UK "unique BitTorrent hash"
        String name "display name"
        String magnetUri "nullable"
        Bytes torrentFile "nullable, raw .torrent"
        BigInt size "total bytes"
        Json fileList "array of path/size/index"
        Boolean isAdminPinned "false"
        DateTime createdAt
        DateTime lastSeenAt
    }
```

The `infoHash` serves as the natural key: regardless of whether the torrent was added via upload or magnet, identical content produces the same hash, enabling deduplication.

---

## TorrentEngine Service

**Location:** `src/services/torrent/torrentEngine.ts`

A singleton class wrapping a single `WebTorrent` client instance. All active torrents share this client, which manages peer connections, piece downloads, and file I/O.

### Singleton Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Idle: Server starts
    Idle --> Active: First getOrAdd call
    note right of Active: WebTorrent client created lazily
    Active --> Active: Subsequent getOrAdd calls
    Active --> Idle: All torrents removed, client stays alive
```

The WebTorrent client is created **lazily** on the first `getOrAdd()` call — not at server startup. This avoids unnecessary resource consumption when no streaming is active. Client settings:

| Setting | Value |
|---|---|
| `maxConns` | 50 per torrent |
| `utp` | Enabled (µTP, UDP-based) |
| `dht` | Enabled (distributed hash table) |
| `tracker` | Enabled (announces to tracker list) |

### Torrent Activation

```mermaid
flowchart TD
    A[getOrAdd infoHash, source] --> B{Already in memory?}
    B -- Yes --> C[Update lastAccessedAt, return handle]
    B -- No --> D{Active count >= MAX?}
    D -- Yes --> E[503 Service Unavailable]
    D -- No --> F{Already pending?}
    F -- Yes --> G[Return existing promise, dedup callers]
    F -- No --> H[client.add with tracker announce list]
    H --> I{Torrent ready within 45s?}
    I -- Yes --> J[Store in Map, return handle]
    I -- No / Error --> K[Reject promise, cleanup]
```

**Three data structures** track state:

| Map | Key | Purpose |
|---|---|---|
| `torrents` | `infoHash` → `TorrentHandle` | Active, ready-to-stream torrents |
| `pending` | `infoHash` → `Promise` | In-flight additions (deduplicates concurrent requests for the same torrent) |

**Source resolution priority:** The `source` parameter determines how WebTorrent finds peers:

1. **`.torrent` file (Buffer)** — fastest; contains tracker URLs + piece hashes
2. **Magnet URI (string)** — needs DHT/tracker to resolve metadata first
3. **No source** — constructs `magnet:?xt=urn:btih:{infoHash}` as fallback

The engine injects a hardcoded announce list (HTTPS + UDP trackers) to improve peer discovery reliability.

### Peer Discovery

After a torrent is added, the engine waits for the `ready` event (metadata + at least one piece available). A separate `waitForPeers()` method is used during streaming:

```mermaid
flowchart TD
    A[waitForPeers infoHash, timeout 15s] --> B{numPeers > 0?}
    B -- Yes --> C[Return immediately]
    B -- No --> D["Listen for 'wire' event"]
    D --> E{Peer connected within timeout?}
    E -- Yes --> F[Resolve]
    E -- No --> G["503 No peers available"]
```

The `wire` event fires when a TCP/µTP connection to a peer is established — this is the earliest signal that data transfer can begin.

### Idle Cleanup

```mermaid
flowchart TD
    A[Cleanup timer, every 5 min] --> B[Iterate all active torrents]
    B --> C{lastAccessedAt < 30 min ago?}
    C -- Yes --> D[Keep alive]
    C -- No --> E["remove(infoHash)"]
    E --> F["client.remove(destroyStore: true)"]
    F --> G[Delete from Map, free memory + disk]
```

Each `TorrentHandle` tracks `lastAccessedAt` (updated on every `getOrAdd` or `getFile` call). The cleanup job:

- Runs on a `setInterval` with `.unref()` so it doesn't prevent Node.js from exiting
- Calls `client.remove()` with `destroyStore: true` to free both memory and any temporary disk storage
- Errors during cleanup are logged but don't crash the process

### Concurrency & Limits

| Parameter | Default | Env Override |
|---|---|---|
| Max concurrent torrents | 20 | `MAX_CONCURRENT_TORRENTS` |
| Max torrent size | 10 GB | `MAX_TORRENT_SIZE_GB` |
| Peer discovery timeout (add) | 45 s | Hardcoded |
| Peer wait timeout (stream) | 15 s | Hardcoded |
| Idle cleanup interval | 5 min | Hardcoded |
| Idle threshold | 30 min | Hardcoded |

When `activeCount() >= maxConcurrent`, new `getOrAdd()` calls immediately return **503 Service Unavailable** — no queuing.

---

## Stream Module

**Location:** `src/modules/stream/`

Bridges the gap between the TorrentEngine and the client's `<video>` element. Two endpoints work together:

| Endpoint | Purpose |
|---|---|
| `GET /api/torrents/:id/stream` | Mint a stream token + return file list |
| `GET /api/stream/:streamToken/:fileIndex` | Pipe video bytes to the client |

### Stream Session Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as GET /api/torrents/:id/stream
    participant DB as PostgreSQL
    participant Engine as TorrentEngine
    participant JWT as Stream Token

    Client->>API: Request stream session
    API->>DB: getTorrentById(id)
    DB-->>API: Torrent record

    alt fileList is empty (magnet-only)
        API->>Engine: getOrAdd(infoHash, magnetUri)
        Engine-->>API: TorrentHandle (metadata resolved)
        API->>DB: Update name, size, fileList
    end

    API->>JWT: mintStreamToken(torrentId, infoHash)
    JWT-->>API: Signed JWT (1h expiry)
    API-->>Client: { streamToken, files[] }
```

The session endpoint is the **only place** where magnet-only torrents get their metadata resolved. Once resolved, the `fileList` is persisted to the DB so subsequent requests skip engine activation.

### Token Security

Stream tokens are JWTs signed with a **separate secret** (`STREAM_TOKEN_SECRET`) from the auth JWT:

| Property | Value |
|---|---|
| Algorithm | HS256 (default jsonwebtoken) |
| Expiry | 1 hour (configurable via `STREAM_TOKEN_EXPIRY`) |
| Payload | `{ torrentId, infoHash }` |
| Secret | `STREAM_TOKEN_SECRET` (independent from `JWT_SECRET`) |

The token is embedded directly in the video URL (`/api/stream/{token}/{fileIndex}`), making it work with the browser's native `<video>` element which can't set custom headers.

### Video Delivery Pipeline

```mermaid
flowchart TD
    A[GET /api/stream/:token/:fileIndex] --> B[Verify stream token]
    B --> C[Load torrent from DB]
    C --> D{fileList resolved?}
    D -- No --> E["400 Request session first"]
    D -- Yes --> F[Validate fileIndex bounds]
    F --> G[Engine getOrAdd]
    G --> H[Engine waitForPeers]
    H --> I[Engine getFile]
    I --> J[wtFile.select - prioritize]
    J --> K{Needs remux?}
    K -- mkv / avi / mov --> L[FFmpeg remux pipeline]
    K -- mp4 / webm --> M[Direct stream with Range]
    L --> N[Pipe to response]
    M --> N
```

### Range Request Handling

For natively supported formats (`.mp4`, `.webm`), the stream endpoint implements full HTTP Range request support. This enables seeking in the video player.

```mermaid
sequenceDiagram
    participant Browser
    participant Stream as Stream Endpoint
    participant WT as WebTorrent File

    Browser->>Stream: GET (no Range header)
    alt File ≤ 10 MB
        Stream-->>Browser: 200 OK (full file)
    else File > 10 MB
        Stream-->>Browser: 206 Partial (first 10 MB chunk)
    end

    Browser->>Stream: GET Range: bytes=1048576-2097151
    Stream->>WT: createReadStream({ start, end })
    WT-->>Stream: Readable stream
    Stream-->>Browser: 206 Partial Content + Content-Range header
```

**Key implementation details:**

- **Max chunk size:** 10 MB per response — caps memory usage per concurrent request
- **Open-ended ranges** (`bytes=X-`): clamped to `start + 10MB - 1`
- **No Range header:** returns first 10 MB as 206 if file exceeds chunk limit
- **Validation:** rejects malformed ranges, out-of-bounds starts, and `start > end`
- `Content-Type` is set based on extension: `video/mp4` (default) or `video/webm`

### FFmpeg Remuxing

Formats that browsers can't natively play (`.mkv`, `.avi`, `.mov`) are **remuxed** (container-swapped) to MP4 on-the-fly:

```mermaid
flowchart LR
    A[WebTorrent File Stream] --> B["FFmpeg: -c copy, fragmented mp4"]
    B --> C["HTTP Response: video/mp4"]
```

| Aspect | Detail |
|---|---|
| **Transcoding?** | No — `copy` codecs, container swap only |
| **Latency** | Minimal; `frag_keyframe+empty_moov` enables streaming without writing a full moov atom first |
| **Range support** | Disabled (`Accept-Ranges: none`) — can't seek within a remuxed stream |
| **Error handling** | FFmpeg errors are logged; if headers not yet sent, responds with 500 |
| **Pipe direction** | `wtFile.createReadStream()` → FFmpeg stdin → FFmpeg stdout → `res` |

The `frag_keyframe+empty_moov` movflags are critical: standard MP4 requires the moov atom (file index) at the beginning, which isn't available when streaming from a torrent. Fragmented MP4 writes self-contained fragments that can be played as they arrive.

---

## End-to-End Request Flow

Complete lifecycle from user action to video playback:

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant Torrent as /api/torrents
    participant Stream as /api/stream
    participant Engine as TorrentEngine
    participant Swarm as BitTorrent Peers

    Note over User,Swarm: Phase 1 — Ingest

    User->>FE: Drop .torrent file or paste magnet
    FE->>Torrent: POST /upload or /magnet
    Torrent-->>FE: { torrent: { id, name, fileList } }

    Note over User,Swarm: Phase 2 — Session

    FE->>Torrent: GET /:id/stream
    Torrent->>Engine: Activate if magnet-only
    Engine->>Swarm: Discover peers, resolve metadata
    Swarm-->>Engine: Metadata + peer connections
    Torrent-->>FE: { streamToken, files[] }

    Note over User,Swarm: Phase 3 — Playback

    FE->>FE: Set video.src = /api/stream/{token}/{fileIndex}
    FE->>Stream: GET /:streamToken/:fileIndex (Range: bytes=0-)
    Stream->>Engine: getOrAdd + waitForPeers + getFile
    Engine->>Swarm: Download pieces on-demand
    Swarm-->>Engine: Video data
    Engine-->>Stream: File read stream
    Stream-->>FE: 206 Partial Content (video bytes)
    FE-->>User: Video plays in browser

    loop Seeking
        User->>FE: Seek to new position
        FE->>Stream: GET (Range: bytes=N-)
        Stream-->>FE: 206 Partial Content
    end
```

---

## Rate Limiting

All torrent and stream endpoints are rate-limited per IP:

| Endpoint | Window | Max Requests |
|---|---|---|
| `POST /api/torrents/upload` | 1 hour | 10 |
| `POST /api/torrents/magnet` | 1 hour | 10 |
| `GET /api/torrents/:id` | 1 hour | 120 |
| `GET /api/torrents/:id/stream` | 1 hour | 60 |
| `GET /api/stream/:token/:fileIndex` | 1 hour | 200 |

Rate limit headers (`RateLimit-*`) are included in responses per the IETF draft standard.

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill env
cp .env.example .env

# 3. Start PostgreSQL + Redis
docker compose up -d

# 4. Run migrations + generate Prisma client
npm run prisma:mig
npm run prisma:gen

# 5. Start dev server (tsx watch, auto-reload)
npm run dev
# → http://localhost:3001
```

**Prerequisites:** Node.js 20+, FFmpeg in PATH (required for mkv/avi/mov remuxing), Docker (for PostgreSQL + Redis).
