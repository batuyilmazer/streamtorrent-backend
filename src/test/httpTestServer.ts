import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { Server as HttpServer } from "node:http";

type AppLike = {
  listen: (...args: any[]) => HttpServer;
};

export interface TestHttpServer {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startHttpTestServer(app: AppLike): Promise<TestHttpServer> {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not resolve test server address.");
  }
  return {
    baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export type CookieJar = Record<string, string>;

export function readSetCookies(headers: Headers): CookieJar {
  const getSetCookie = (
    headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie;
  const rawCookies = typeof getSetCookie === "function" ? getSetCookie.call(headers) : [];
  return rawCookies.reduce<CookieJar>((jar, cookie) => {
    const firstPart = cookie.split(";", 1)[0];
    if (!firstPart) return jar;
    const separatorIndex = firstPart.indexOf("=");
    if (separatorIndex <= 0) return jar;
    const name = firstPart.slice(0, separatorIndex).trim();
    const value = firstPart.slice(separatorIndex + 1).trim();
    jar[name] = value;
    return jar;
  }, {});
}

export function mergeCookies(target: CookieJar, source: CookieJar): CookieJar {
  return {
    ...target,
    ...source,
  };
}

export function toCookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}
