// Lightweight dev-only logger. In production every call is a no-op so we
// don't leak internal state to end-user DevTools or hurt runtime perf.
const isDev = process.env.NODE_ENV !== 'production';

export const log = (...args) => { if (isDev) console.log(...args); };
export const warn = (...args) => { if (isDev) console.warn(...args); };
// Errors we keep in production too — they're valuable for Sentry-like tools
// and the user usually sees a toast anyway, so this is not info-disclosure.
export const error = (...args) => { console.error(...args); };
