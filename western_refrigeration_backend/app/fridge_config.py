"""
Centralised configuration for Western Refrigeration fridge models and parts.

This is the single source of truth for:
  - Part names (universal across all models)
  - Fridge model families
  - Supported job types
"""

# ─── 27 universal parts ────────────────────────────────────
ALL_PARTS: list[str] = [
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
]

# ─── 8 model families ──────────────────────────────────────
FRIDGE_MODELS: list[str] = [
    "FTWH",
    "HFWH",
    "HFWP",
    "HRWE",
    "HRWH",
    "PR-600",
    "RTWH",
    "RTWP",
]

# ─── Only 1 job type now ───────────────────────────────────
JOB_TYPES: list[str] = [
    "presence",   # presence / absence check
]
