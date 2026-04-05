# StreamTorrent Backend

Express + Prisma backend for StreamTorrent.

## Responsibilities

- authentication, refresh rotation, and 2FA-scoped actions
- torrent ingestion and metadata persistence
- stream session minting and media delivery
- file upload/download orchestration through S3-compatible storage
- collections and saved-torrent ownership flows

## Structure

```text
src/
├── config/
├── modules/
│   ├── auth/
│   ├── collections/
│   ├── common/
│   ├── files/
│   ├── stream/
│   ├── torrents/
│   └── user-torrents/
├── services/
└── types/
```

## Commands

```sh
npm run dev
npm run build
npm run typecheck
npm run test
```

## Conventions

- runtime env access belongs in `src/config/env.ts`
- route modules should follow `routes -> controller -> service`
- authenticated request state is typed through shared common helpers, not controller-local casts
- `dist/` is generated output only
- integration tests exercise auth refresh rotation and stream boundary behavior through real HTTP routes while mocking Prisma and torrent-engine seams
