import * as z from 'zod/mini'

// zod/mini instead of the full 'zod': about 5 KB instead of 65 KB (gzip) in the code every
// page downloads, same validation core (optimization-log O-06). Rules are written as
// z.string().check(z.trim(), z.maxLength(...)) instead of method chains.
//
// The CSP has no 'unsafe-eval' in production (defect-log D-05). Without jitless, Zod
// tries `new Function('')` once to see whether it may compile schemas; the browser
// reports that as a CSP violation even though Zod catches the error.
// Import z from here, never from 'zod' directly (ESLint enforces).
z.config({ jitless: true })

export { z }
