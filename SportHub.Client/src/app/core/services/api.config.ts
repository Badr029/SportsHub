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

/**
 * Serialises a Date as local wall-clock time, e.g. "2026-09-08T17:00:00".
 *
 * The API stores and compares booking times as local wall clock (see
 * BookingsController.CreateBooking, which validates against DateTime.Now).
 * Sending `toISOString()` instead shifts every value by the UTC offset, which
 * is how equipment rentals ended up recorded hours before the customer's
 * chosen pickup time.
 */
export function toLocalDateTime(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}
