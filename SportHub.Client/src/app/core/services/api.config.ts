export const API_BASE_URL = 'http://localhost:5165/api';
export const API_ORIGIN = API_BASE_URL.replace('/api', '');

export function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return '';
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('/')) {
    return `${API_ORIGIN}${imageUrl}`;
  }

  return imageUrl;
}
