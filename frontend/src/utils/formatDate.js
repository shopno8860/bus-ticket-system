/**
 * @param {string|number|Date} value
 * @param {Intl.DateTimeFormatOptions} [options] - merged over en-BD medium/short defaults
 */
export function formatDate(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date);
}
