/**
 * Utility functions for formatting and text normalization
 * Extracted from ContractGenerator.tsx to improve maintainability
 */

/**
 * Normalizes smart quotes and special characters to standard ASCII equivalents
 * @param text - The text to normalize
 * @returns Normalized text with standard characters
 */
export function normalizeSmartQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"') // " "
    .replace(/[\u2018\u2019]/g, "'") // ' '
    .replace(/\u2013/g, "-")         // –
    .replace(/\u2014/g, "--")        // —
    .replace(/\u2026/g, "...")       // ...
    .replace(/\u00a0/g, " ")         // non-breaking space
    .replace(/\u2022/g, "-");        // bullet to dash
}

/**
 * Formats a value as USD currency
 * @param value - The value to format (number, string, or other)
 * @returns Formatted currency string or original value if invalid
 */
export function formatCurrency(value: any): string {
  const num = Number(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '$0';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/**
 * Formats a value as a number with commas
 * @param value - The value to format (number, string, or other)
 * @returns Formatted number string or original value if invalid
 */
export function formatNumber(value: any): string | undefined {
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US');
}

/**
 * Converts YYYY-MM-DD format to MM/DD/YYYY format
 * Returns original value if not in YYYY-MM-DD format
 * @param value - The date string to format
 * @returns Formatted date string or original value
 */
export function formatDate(value: any): string {
  if (!value || typeof value !== 'string') return '';
  // Match YYYY-MM-DD
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${m}/${d}/${y}`;
  }
  return value;
} 