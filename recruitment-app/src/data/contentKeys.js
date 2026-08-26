/**
 * Display order for the benefit and gallery grids, as the legacy page had them.
 *
 * Kept apart from ./icons.js because that module imports `.svg?raw`, which only
 * resolves inside Vite — scripts/verify-content.mjs runs under plain node and
 * needs these keys to check that each one has an icon, a photo and a string in
 * all six locales.
 */
export const BENEFIT_KEYS = ['salary', 'health', 'growth', 'balance', 'projects', 'impact']
export const GALLERY_KEYS = ['survey', 'office', 'event']
