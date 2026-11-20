import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(4, "Full name must be at least 4 characters")
    .max(100, "Full name is too long"),

  email: z
    .string()
    .email("Please enter a valid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address"),

  password: z
    .string()
    .min(1, "Password is required")
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;