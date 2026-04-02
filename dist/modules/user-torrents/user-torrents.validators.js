import { z } from "zod";
export const torrentIdParamsSchema = z.object({
    torrentId: z.string().min(1),
});
//# sourceMappingURL=user-torrents.validators.js.map