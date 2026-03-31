// API Configuration
// In development: use empty string (Vite proxy handles /api)
// In production: use full backend URL from environment variable
export const API_URL = import.meta.env.VITE_API_URL || '';
