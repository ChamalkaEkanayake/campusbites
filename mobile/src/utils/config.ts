import { Platform } from 'react-native';

// For Android Emulator use 10.0.2.2, for iOS/Web use localhost
// When deploying backend to Render/Railway, replace this URL with the live hosted API URL
export const API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000/api'
  : 'http://localhost:5000/api';

export const UPLOADS_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000/'
  : 'http://localhost:5000/';

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
