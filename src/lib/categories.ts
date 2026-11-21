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

export const CATEGORY_LABEL_MAP: Readonly<Record<CategoryId, string>> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category.label])
) as Readonly<Record<CategoryId, string>>;
