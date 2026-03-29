import { z } from "zod";

// Requires at minimum: magnet:?xt=urn:<scheme>:<40-char hex hash>
const MAGNET_RE = /^magnet:\?(?:.*&)?xt=urn:[a-zA-Z0-9]+:[a-fA-F0-9]{40}/;

export const magnetSchema = z.object({
  magnetUri: z
    .string()
    .min(1)
    .refine((uri) => MAGNET_RE.test(uri), {
      message: "Must be a valid magnet URI.",
    }),
});
