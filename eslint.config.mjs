import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design-system rules (S04-05) for code written against the new tokens. Old pages are
// left alone until they move to the new UI; C8 then removes the legacy CSS.
const NEW_UI = [
  "components/ui/**/*.{ts,tsx}",
  "components/patterns/**/*.{ts,tsx}",
  "features/*/components/**/*.{ts,tsx}",
  "app/(app)/**/*.{ts,tsx}",
  "app/(auth)/**/*.{ts,tsx}",
];

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
    // v1 files kept until their screens are rebuilt (C3–C7); each leaves this list then
    ignores: [
      "components/ui/ErrorBanner.tsx",
      "app/(app)/page.tsx",
      "app/(app)/add/page.tsx",
      "app/(app)/history/page.tsx",
      "app/(auth)/login/page.tsx",
    ],
    rules: {
      "no-restricted-syntax": ["error", ...restrictedSyntax],
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
