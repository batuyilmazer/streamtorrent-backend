import { z } from "zod";

export const torrentIdParamsSchema = z.object({
  torrentId: z.string().min(1),
});
export type TorrentIdParams = z.infer<typeof torrentIdParamsSchema>;
