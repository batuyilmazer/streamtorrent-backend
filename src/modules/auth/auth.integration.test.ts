import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import argon2 from "argon2";
import server from "../../server.js";
import { prisma } from "../../config/db.js";
import { type ApiErrorResponseDto } from "../common/api-error.dto.js";
import {
  readSetCookies,
  startHttpTestServer,
  toCookieHeader,
  type CookieJar,
} from "../../test/httpTestServer.js";
import { restoreStubbedMethods, stubMethod } from "../../test/stubMethod.js";

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  failedLoginCount: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  role: "USER";
  createdAt: Date;
  updatedAt: Date;
}

interface RefreshTokenRecord {
  id: string;
  userId: string;
  jti: string;
  tokenHash: string;
  userAgent: string | null;
  ip: string | null;
  deviceId: string;
  revoked: boolean;
  createdAt: Date;
  expiresAt: Date;
}

function pickSelectedFields<T extends object>(
  record: T,
  select?: Record<string, boolean>,
): Partial<T> | T {
  if (!select) return { ...record };
  const pickedEntries = Object.entries(select)
    .filter(([, enabled]) => enabled)
    .map(([key]) => [key, record[key as keyof T]]);
  return Object.fromEntries(pickedEntries) as Partial<T>;
}

function matchesWhere<T extends object>(
  record: T,
  where: Partial<Record<keyof T, unknown>>,
): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    return record[key as keyof T] === value;
  });
}

function installAuthPrismaMocks() {
  const usersById = new Map<string, UserRecord>();
  const usersByEmail = new Map<string, UserRecord>();
  const refreshTokensByJti = new Map<string, RefreshTokenRecord>();
  let userCount = 0;
  let refreshCount = 0;

  stubMethod(argon2 as any, "hash", async (value: string | Buffer) => {
    return `hashed:${value}`;
  });
  stubMethod(
    argon2 as any,
    "verify",
    async (hash: string, value: string | Buffer) => hash === `hashed:${value}`,
  );

  stubMethod(prisma.user as any, "findUnique", async (args: any) => {
    const record = args.where.email
      ? usersByEmail.get(args.where.email)
      : args.where.id
        ? usersById.get(args.where.id)
        : undefined;
    return record ? pickSelectedFields(record, args.select) : null;
  });

  stubMethod(prisma.user as any, "create", async (args: any) => {
    const now = new Date();
    const record: UserRecord = {
      id: `user_${++userCount}`,
      email: args.data.email,
      passwordHash: args.data.passwordHash,
      emailVerified: false,
      failedLoginCount: 0,
      lockUntil: null,
      lastLoginAt: null,
      passwordChangedAt: null,
      role: "USER",
      createdAt: now,
      updatedAt: now,
    };
    usersById.set(record.id, record);
    usersByEmail.set(record.email, record);
    return { ...record };
  });

  stubMethod(prisma.user as any, "update", async (args: any) => {
    const record = usersById.get(args.where.id);
    if (!record) throw new Error(`User ${args.where.id} not found.`);
    Object.assign(record, args.data, { updatedAt: new Date() });
    return { ...record };
  });

  stubMethod(
    prisma.refreshToken as any,
    "create",
    async (args: any) => {
      const record: RefreshTokenRecord = {
        id: `refresh_${++refreshCount}`,
        revoked: false,
        createdAt: new Date(),
        ...(args.data as Omit<RefreshTokenRecord, "id" | "revoked" | "createdAt">),
      };
      refreshTokensByJti.set(record.jti, record);
      return { ...record };
    },
  );

  stubMethod(
    prisma.refreshToken as any,
    "findUnique",
    async (args: any) => {
      const record = refreshTokensByJti.get(args.where.jti);
      return record ? pickSelectedFields(record, args.select) : null;
    },
  );

  stubMethod(
    prisma.refreshToken as any,
    "update",
    async (args: any) => {
      const record = refreshTokensByJti.get(args.where.jti);
      if (!record) throw new Error(`Refresh token ${args.where.jti} not found.`);
      Object.assign(record, args.data);
      return { ...record };
    },
  );

  stubMethod(
    prisma.refreshToken as any,
    "updateMany",
    async (args: any) => {
      let count = 0;
      for (const record of refreshTokensByJti.values()) {
        if (!matchesWhere(record, args.where as Partial<Record<keyof RefreshTokenRecord, unknown>>)) continue;
        Object.assign(record, args.data as Partial<RefreshTokenRecord>);
        count += 1;
      }
      return { count };
    },
  );

  stubMethod(prisma as any, "$transaction", async (callback: any) => {
    return callback(prisma);
  });
}

afterEach(() => {
  restoreStubbedMethods();
});

async function postJson(
  baseUrl: string,
  path: string,
  options: {
    body?: unknown;
    cookies?: CookieJar;
  } = {},
) {
  const headers = new Headers();
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.cookies && Object.keys(options.cookies).length > 0) {
    headers.set("Cookie", toCookieHeader(options.cookies));
  }
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

describe("auth integration", () => {
  it("register issues access token and session cookies", async () => {
    installAuthPrismaMocks();
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await postJson(httpServer.baseUrl, "/auth/register", {
        body: {
          email: "User@Example.com",
          password: "password123",
        },
      });
      const body = (await response.json()) as {
        access: string;
        user: { id: string; email: string };
      };
      const cookies = readSetCookies(response.headers);

      assert.equal(response.status, 201);
      assert.ok(body.access);
      assert.equal(body.user.email, "user@example.com");
      assert.ok(cookies.refreshToken);
      assert.ok(cookies.deviceId);
    } finally {
      await httpServer.close();
    }
  });

  it("refresh rotates the session when refresh cookies are present", async () => {
    installAuthPrismaMocks();
    const httpServer = await startHttpTestServer(server);

    try {
      const registerResponse = await postJson(httpServer.baseUrl, "/auth/register", {
        body: {
          email: "rotate@example.com",
          password: "password123",
        },
      });
      const sessionCookies = readSetCookies(registerResponse.headers);
      const oldRefreshToken = sessionCookies.refreshToken;

      const refreshResponse = await postJson(httpServer.baseUrl, "/auth/refresh", {
        body: {},
        cookies: sessionCookies,
      });
      const refreshBody = (await refreshResponse.json()) as { access: string };
      const rotatedCookies = readSetCookies(refreshResponse.headers);

      assert.equal(refreshResponse.status, 200);
      assert.ok(refreshBody.access);
      assert.ok(rotatedCookies.refreshToken);
      assert.notEqual(rotatedCookies.refreshToken, oldRefreshToken);
      assert.equal(rotatedCookies.deviceId, sessionCookies.deviceId);
    } finally {
      await httpServer.close();
    }
  });

  it("refresh accepts refreshToken and deviceId from the request body", async () => {
    installAuthPrismaMocks();
    const httpServer = await startHttpTestServer(server);

    try {
      const registerResponse = await postJson(httpServer.baseUrl, "/auth/register", {
        body: {
          email: "body-fallback@example.com",
          password: "password123",
        },
      });
      const sessionCookies = readSetCookies(registerResponse.headers);

      const refreshResponse = await postJson(httpServer.baseUrl, "/auth/refresh", {
        body: {
          refreshToken: sessionCookies.refreshToken,
          deviceId: sessionCookies.deviceId,
        },
      });
      const refreshBody = (await refreshResponse.json()) as { access: string };

      assert.equal(refreshResponse.status, 200);
      assert.ok(refreshBody.access);
    } finally {
      await httpServer.close();
    }
  });

  it("refresh returns the shared bad-request contract when the refresh token is missing", async () => {
    installAuthPrismaMocks();
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await postJson(httpServer.baseUrl, "/auth/refresh", {
        body: {},
      });
      const body = (await response.json()) as ApiErrorResponseDto;

      assert.equal(response.status, 400);
      assert.deepEqual(body, {
        error: "BAD_REQUEST",
        message: "No refresh token provided.",
      });
    } finally {
      await httpServer.close();
    }
  });

  it("refresh returns the shared bad-request contract when the device id is missing", async () => {
    installAuthPrismaMocks();
    const httpServer = await startHttpTestServer(server);

    try {
      const response = await postJson(httpServer.baseUrl, "/auth/refresh", {
        body: {
          refreshToken: "refresh-token-without-device",
        },
      });
      const body = (await response.json()) as ApiErrorResponseDto;

      assert.equal(response.status, 400);
      assert.deepEqual(body, {
        error: "BAD_REQUEST",
        message: "No deviceId provided.",
      });
    } finally {
      await httpServer.close();
    }
  });

  it("logout revokes the active refresh session", async () => {
    installAuthPrismaMocks();
    const httpServer = await startHttpTestServer(server);

    try {
      const registerResponse = await postJson(httpServer.baseUrl, "/auth/register", {
        body: {
          email: "logout@example.com",
          password: "password123",
        },
      });
      const initialCookies = readSetCookies(registerResponse.headers);

      const logoutResponse = await postJson(httpServer.baseUrl, "/auth/logout", {
        body: {},
        cookies: initialCookies,
      });
      assert.equal(logoutResponse.status, 200);

      const postLogoutRefresh = await postJson(httpServer.baseUrl, "/auth/refresh", {
        body: {
          refreshToken: initialCookies.refreshToken,
          deviceId: initialCookies.deviceId,
        },
      });
      const body = (await postLogoutRefresh.json()) as ApiErrorResponseDto;

      assert.equal(postLogoutRefresh.status, 401);
      assert.deepEqual(body, {
        error: "UNAUTHORIZED",
        message: "Session revoked.",
      });
    } finally {
      await httpServer.close();
    }
  });
});
