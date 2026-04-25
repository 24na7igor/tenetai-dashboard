// API Configuration
// Uses environment variable in production, falls back to localhost for development
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_URL = rawApiUrl.replace(/\/+$/, ''); // Remove trailing slashes
export const API_BASE = `${API_URL}/api/v1`;

// Google OAuth
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Environment
export const IS_PRODUCTION = import.meta.env.PROD;
