import { z } from "zod";
import { CATEGORY_IDS, CATEGORIES, type CategoryId, type CategoryMeta } from "./categories.ts";

export { CATEGORY_IDS, CATEGORIES, type CategoryId, type CategoryMeta };

export const CategoryIdSchema = z.enum(CATEGORY_IDS);

export const TRUST_TIERS = [
  "official-gov-ph",
  "official-non-gov-domain",
  "official-partner",
] as const;

export type TrustTier = (typeof TRUST_TIERS)[number];
export const TrustTierSchema = z.enum(TRUST_TIERS);

export const SUB_LINK_KINDS = [
  "appointment",
  "verification",
  "payment",
  "guide",
  "homepage",
] as const;

export type SubLinkKind = (typeof SUB_LINK_KINDS)[number];
export const SubLinkKindSchema = z.enum(SUB_LINK_KINDS);

export const ONLINE_TRANSACTIONS = ["full", "partial", "info-only"] as const;
export type OnlineTransaction = (typeof ONLINE_TRANSACTIONS)[number];
export const OnlineTransactionSchema = z.enum(ONLINE_TRANSACTIONS);

export const SafeUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "URL must use https:// or http://" }
  );

export const SubLinkSchema = z.object({
  label: z.string().trim().min(2).max(80),
  url: SafeUrlSchema,
  kind: SubLinkKindSchema,
});

export type SubLink = z.infer<typeof SubLinkSchema>;

export const PortalEntrySchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
    title: z.string().trim().min(3).max(100),
    agency: z.string().trim().min(2).max(120),
    agencyShort: z.string().trim().min(2).max(24),
    category: CategoryIdSchema,
    coverage: z.enum(["nationwide", "city"]),
    cityName: z.string().trim().min(2).max(60).optional(),
    summary: z.string().trim().min(10).max(220),
    primaryUrl: SafeUrlSchema,
    primaryActionLabel: z.string().trim().min(4).max(60),
    subLinks: z.array(SubLinkSchema).max(5).default([]),
    trustTier: TrustTierSchema,
    verificationSourceUrl: SafeUrlSchema,
    verificationNote: z.string().trim().min(8).max(220),
    lastVerified: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "lastVerified must be YYYY-MM-DD"),
    scamWarning: z.string().trim().min(10).max(280).optional(),
    aliases: z.array(z.string().trim().min(1)).min(1),
    popular: z.boolean(),
    requiresAppointment: z.boolean(),
    onlineTransaction: OnlineTransactionSchema,
  })
  .superRefine((entry, ctx) => {
    if (entry.coverage === "city" && !entry.cityName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cityName"],
        message: "cityName is required when coverage is 'city'",
      });
    }
    if (entry.coverage === "nationwide" && entry.cityName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cityName"],
        message: "cityName must be omitted when coverage is 'nationwide'",
      });
    }
  });

export type PortalEntry = z.infer<typeof PortalEntrySchema>;
export const PortalListSchema = z.array(PortalEntrySchema);
