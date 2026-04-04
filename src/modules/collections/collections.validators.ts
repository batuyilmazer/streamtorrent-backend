import { z } from "zod";

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const updateCollectionSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided.",
  });
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export const addItemSchema = z.object({
  torrentId: z.string().min(1),
});
export type AddCollectionItemInput = z.infer<typeof addItemSchema>;

export const collectionIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type CollectionIdParams = z.infer<typeof collectionIdParamsSchema>;

export const removeItemParamsSchema = z.object({
  id: z.string().min(1),
  torrentId: z.string().min(1),
});
export type RemoveItemParams = z.infer<typeof removeItemParamsSchema>;
