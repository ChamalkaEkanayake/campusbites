import { Platform } from 'react-native';

// Live Render Hosted Backend API URL (SLIIT SE2020 Production Deployment)
const LIVE_SERVER_URL = 'https://campusbites-qoov.onrender.com';

export const API_BASE_URL = `${LIVE_SERVER_URL}/api`;
export const UPLOADS_BASE_URL = `${LIVE_SERVER_URL}/`;

/**
 * Safely builds a full image URL from a stored image path.
 * Handles:
 *  - null / undefined image fields → returns empty string (no broken image crash)
 *  - Already-absolute URLs (http/https) → returned as-is
 *  - Windows backslash paths → normalised to forward slashes
 *  - Double-slash edge cases (e.g. "/uploads/...") → trimmed correctly
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return '';

  // Already a full URL — return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Normalise Windows backslashes to forward slashes
  const normalised = imagePath.replace(/\\/g, '/');

  // Remove any leading slash to avoid double-slash with base URL
  const trimmed = normalised.startsWith('/') ? normalised.slice(1) : normalised;

  return `${UPLOADS_BASE_URL}${trimmed}`;
}
