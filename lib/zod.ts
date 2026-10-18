import { z } from 'zod'

// The CSP has no 'unsafe-eval' in production (defect-log D-05). Without this setting
// Zod tries `new Function('')` once to see whether it may compile schemas; the browser
// reports that as a CSP violation even though Zod catches the error. Validation works
// the same either way. Import z from here, never from 'zod' directly (ESLint enforces).
z.config({ jitless: true })

export { z }
