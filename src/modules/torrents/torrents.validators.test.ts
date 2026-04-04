import test from "node:test";
import assert from "node:assert/strict";
import { magnetSchema } from "./torrents.validators.js";

test("magnetSchema accepts a well-formed magnet URI", () => {
  const result = magnetSchema.safeParse({
    magnetUri: "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567",
  });

  assert.equal(result.success, true);
});

test("magnetSchema rejects malformed magnet URIs", () => {
  const result = magnetSchema.safeParse({
    magnetUri: "magnet:?xt=urn:btih:not-a-real-hash",
  });

  assert.equal(result.success, false);
});
