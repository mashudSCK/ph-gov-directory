import { z } from "zod";

export const CATEGORY_IDS = [
  "ids-civil",
  "clearances",
  "travel-immigration",
  "driving-vehicles",
  "exams-licenses",
  "social-health",
  "taxes-business",
  "local-elections",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    id: "ids-civil",
    label: "IDs & Civil Registry",
    shortLabel: "IDs & Civil",
    description: "Birth certificates, National ID, Postal ID, and civil registry appointments.",
  },
  {
    id: "clearances",
    label: "NBI & Police Clearances",
    shortLabel: "Clearances",
    description: "NBI clearance, PNP National Police Clearance, and employment clearances.",
  },
  {
    id: "travel-immigration",
    label: "Passports, Travel & Immigration",
    shortLabel: "Passports & Travel",
    description: "DFA passport appointments, apostille, eTravel, BI eServices, DMW, and OWWA.",
  },
  {
    id: "driving-vehicles",
    label: "Driver's Licenses & Vehicles",
    shortLabel: "Driving & Vehicles",
    description: "LTO LTMS portal, vehicle registration, maritime, and transport services.",
  },
  {
    id: "exams-licenses",
    label: "Exams & Professional Licenses",
    shortLabel: "Exams & PRC",
    description: "CSC civil service exams, PRC LERIS licensure, TESDA, and CHED portals.",
  },
  {
    id: "social-health",
    label: "SSS, PhilHealth, Pag-IBIG & Benefits",
    shortLabel: "SSS & Benefits",
    description: "Social security contributions, health insurance, housing funds, GSIS, and DSWD.",
  },
  {
    id: "taxes-business",
    label: "Taxes & Business Registration",
    shortLabel: "Taxes & Business",
    description: "BIR ORUS/eFPS/eBIRForms, DTI BNRS, SEC eSPARC/eFAST, and business permits.",
  },
  {
    id: "local-elections",
    label: "Major City e-Services & Elections",
    shortLabel: "Cities & Voting",
    description: "Major city online portals (QC, Manila, Makati, Cebu, Davao) and COMELEC voter services.",
  },
] as const;

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
