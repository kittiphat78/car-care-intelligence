import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design-system rules (S04-05). Since C8 every screen is on the new design, so they
// cover all UI code.
const NEW_UI = ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "features/**/*.{ts,tsx}"];

const PALETTE = "white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTIL = "bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|divide|decoration|placeholder|caret|accent";

// Each pattern is checked against string literals and template text (class names)
const CLASS_RULES = [
  [String.raw`(^|\s|:)text-xs\b|text-\[(1[0-3]|[0-9])px\]|text-\[0?\.[0-7]\d*rem\]`, "ตัวอักษรต้องไม่เล็กกว่า 14px (text-caption) — design-tokens.md §4"],
  [String.raw`(^|\s|:)(${COLOR_UTIL})-\[(#|rgb|hsl|oklch|var\()`, "ใช้ utility จาก semantic token (เช่น bg-surface, text-link) แทน hex / rgb / var() — design-to-code-map.md §1"],
  [String.raw`(^|\s|:)(${COLOR_UTIL})-(${PALETTE})(-\d+)?(\/\d+)?(\s|$)`, "ห้ามใช้สีของ Tailwind ตรง ๆ ใช้ semantic token (design-tokens.md §3)"],
  [String.raw`(^|\s|:)(uppercase|tracking-(wide|wider|widest))\b`, "ห้าม uppercase และ letter-spacing กว้างกับภาษาไทย — design-tokens.md §4"],
];

const restrictedSyntax = CLASS_RULES.flatMap(([pattern, message]) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
]).concat([
  {
    selector: "JSXAttribute[name.name='style'] Property[key.name=/^(color|background|backgroundColor|borderColor|fill|stroke)$/]",
    message: "สีต้องมาจาก token ผ่าน className ไม่ใช่ style={{}} (TD-32)",
  },
]);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: NEW_UI,
    rules: {
      "no-restricted-syntax": ["error", ...restrictedSyntax],
    },
  },
  {
    // Zod is configured for the CSP in one place (lib/zod.ts, defect-log D-05)
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/zod.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: ["zod", "zod/mini", "zod/v4"].map((name) => ({ name, message: "import { z } from '@/lib/zod' (zod/mini ที่ตั้งค่าให้ผ่าน CSP แล้ว · D-05, O-06)" })) }],
    },
  },
  {
    // Layering (folder-structure.md §2): primitives and patterns know nothing about
    // the shop's data or Supabase
    files: ["components/ui/**/*.{ts,tsx}", "components/patterns/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*", "@/features/**"], message: "components/ui และ patterns ห้าม import จาก features (folder-structure.md §2)" },
            { group: ["@/lib/supabase", "@/lib/supabase/*", "@supabase/*"], message: "components/ui และ patterns ห้ามเรียก Supabase" },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
