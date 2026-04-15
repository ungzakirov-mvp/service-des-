import type { Lang } from './LanguageContext';

/**
 * Get localized field from an object with _ru/_uz/_en suffixed fields.
 * E.g. getLocalizedField(service, 'name', 'ru') → service.name_ru
 */
export function getLocalizedField(obj: any, field: string, lang: Lang): string {
  if (!obj) return '';
  const val = obj[`${field}_${lang}`];
  if (val) return val;
  return obj[`${field}_ru`] || '';
}

/**
 * Format price in UZS
 */
export function formatPrice(price: number, lang: Lang): string {
  if (lang === 'en') return `${price.toLocaleString('en-US')} UZS`;
  return `${price.toLocaleString('ru-RU')} сум`;
}
