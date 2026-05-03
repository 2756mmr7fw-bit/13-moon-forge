export * from "./generated/api";

import { z } from "zod";

// AuthUser schema — manually defined to match the OpenAPI spec's AuthUser component
export const AuthUser = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
});

export type AuthUser = z.infer<typeof AuthUser>;
