import { z } from 'zod'

/**
 * Client-safe Environment Variables Schema (NEXT_PUBLIC_*)
 * Strictly validates that required variables are non-empty and well-formed.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_URL is required')
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g. https://xyz.supabase.co)'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(10, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid non-empty string'),
  NEXT_PUBLIC_WEATHER_LAT: z.string().default('19.91'),
  NEXT_PUBLIC_WEATHER_LON: z.string().default('99.84'),
})

function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
}

// 1. Fail-fast validation for client/public environment variables
const clientParsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_WEATHER_LAT: process.env.NEXT_PUBLIC_WEATHER_LAT,
  NEXT_PUBLIC_WEATHER_LON: process.env.NEXT_PUBLIC_WEATHER_LON,
})

if (!clientParsed.success) {
  const errorMsg = `\n❌ [ENV VALIDATION FAILED] Critical client environment variables missing or invalid:\n${formatZodErrors(clientParsed.error)}\n`
  console.error(errorMsg)
  throw new Error(errorMsg)
}

const clientData = clientParsed.data

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: clientData.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: clientData.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_WEATHER_LAT: clientData.NEXT_PUBLIC_WEATHER_LAT,
  NEXT_PUBLIC_WEATHER_LON: clientData.NEXT_PUBLIC_WEATHER_LON,
} as const

export type Env = typeof env
