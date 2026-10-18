import { z } from "zod";

// Photos of a property (L1-12): what the browser sends to the server
// actions. The file itself is checked from its content (core/images/webp.ts).

export const photoCaptionMax = 200;

export const addPhotoSchema = z.object({
  propertyId: z.string().uuid(),
  file: z.instanceof(Blob),
});

export const photoRefSchema = z.object({
  propertyId: z.string().uuid(),
  photoId: z.string().uuid(),
});

export const reorderPhotosSchema = z.object({
  propertyId: z.string().uuid(),
  photoIds: z.array(z.string().uuid()).max(15),
});

export const captionPhotoSchema = photoRefSchema.extend({
  // Empty: no caption.
  caption: z
    .string()
    .trim()
    .max(photoCaptionMax)
    .transform((text) => text || null),
});
