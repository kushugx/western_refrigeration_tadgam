/**
 * Centralised configuration for Western Refrigeration fridge models and parts.
 *
 * Single source of truth for the frontend — keep in sync with
 * western_refrigeration_backend/app/fridge_config.py
 */

// ─── 27 universal parts ────────────────────────────────────
export const ALL_PARTS: string[] = [
  "Accessories",
  "Back Side",
  "Cable Tie Fixing",
  "Condensing Unit",
  "Dew Collector",
  "Display",
  "Feet",
  "First FG",
  "Front Side",
  "Keys",
  "Last FG",
  "Left Door",
  "Left Side",
  "Logo",
  "Manual",
  "Hinge",
  "Open Door",
  "Power Box",
  "Power Box Light",
  "Power Cord",
  "QC Sticker",
  "Right Door",
  "Right Side",
  "Shelf Sticker",
  "Suction Duct",
  "Top Side",
  "Wheels",
];

// ─── 8 model families ──────────────────────────────────────
export const FRIDGE_MODELS: string[] = [
  "FTWH",
  "HFWH",
  "HFWP",
  "HRWE",
  "HRWH",
  "PR-600",
  "RTWH",
  "RTWP",
];

// ─── Only 1 job type ───────────────────────────────────────
export const JOB_TYPES = ["presence"] as const;
export type JobType = (typeof JOB_TYPES)[number];
