import { z } from "zod";

export const torrentIdParamsSchema = z.object({
  torrentId: z.string().min(1),
});
