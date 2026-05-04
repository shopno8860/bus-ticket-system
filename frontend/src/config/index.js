/**
 * Frontend environment configuration (Vite `import.meta.env`).
 * @property {string} apiBaseUrl - REST API origin; empty string in prod build if unset (configure VITE_API_BASE_URL).
 */
export const config = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:3000' : ''),
};
