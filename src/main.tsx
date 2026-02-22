import { Buffer } from 'buffer'

// Provide Node Buffer global before loading app modules.
;(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer

void import('./bootstrap')
