import test from "node:test";
import assert from "node:assert/strict";
import { HttpError } from "./errors.js";
import { requireUserId } from "./requestContext.js";

test("requireUserId returns the authenticated user id", () => {
  const req = { user: { id: "user-123" } } as Parameters<typeof requireUserId>[0];
  assert.equal(requireUserId(req), "user-123");
});

test("requireUserId throws when user context is missing", () => {
  const req = {} as Parameters<typeof requireUserId>[0];
  assert.throws(() => requireUserId(req), (error: unknown) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.statusCode, 401);
    return true;
  });
});
