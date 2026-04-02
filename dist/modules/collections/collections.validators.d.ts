import { z } from "zod";
export declare const createCollectionSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const updateCollectionSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const addItemSchema: z.ZodObject<{
    torrentId: z.ZodString;
}, z.core.$strip>;
export declare const collectionIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const removeItemParamsSchema: z.ZodObject<{
    id: z.ZodString;
    torrentId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=collections.validators.d.ts.map