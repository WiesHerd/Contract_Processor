/**
 * Tests for the extracted formatting utility functions
 * These tests verify that the extracted functions work exactly the same as the original
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeSmartQuotes, 
  formatCurrency, 
  formatNumber, 
  formatDate 
} from '../formattingUtils';

describe('Formatting Utils - Extracted Functions', () => {
  describe('normalizeSmartQuotes', () => {
    it('should normalize smart quotes to regular quotes', () => {
      expect(normalizeSmartQuotes('"Hello World"')).toBe('"Hello World"');
      expect(normalizeSmartQuotes('"Test"')).toBe('"Test"');
    });

    it('should normalize smart apostrophes to regular apostrophes', () => {
      expect(normalizeSmartQuotes("Don't")).toBe("Don't");
      expect(normalizeSmartQuotes("It's")).toBe("It's");
    });

    it('should normalize en-dash to regular dash', () => {
      expect(normalizeSmartQuotes('2020–2023')).toBe('2020-2023');
    });

    it('should normalize em-dash to double dash', () => {
      expect(normalizeSmartQuotes('Hello—World')).toBe('Hello--World');
    });

    it('should normalize ellipsis to three dots', () => {
      expect(normalizeSmartQuotes('Hello…World')).toBe('Hello...World');
    });

    it('should normalize non-breaking space to regular space', () => {
      expect(normalizeSmartQuotes('Hello\u00a0World')).toBe('Hello World');
    });

    it('should normalize bullet to dash', () => {
      expect(normalizeSmartQuotes('• Item')).toBe('- Item');
    });

    it('should handle mixed special characters', () => {
      expect(normalizeSmartQuotes('"Hello"—World…Test•Item')).toBe('"Hello"--World...Test-Item');
    });

    it('should handle empty string', () => {
      expect(normalizeSmartQuotes('')).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(normalizeSmartQuotes('Hello World')).toBe('Hello World');
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers as USD currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(150000)).toBe('$150,000');
      expect(formatCurrency(1234567)).toBe('$1,234,567');
    });

    it('should handle string numbers', () => {
      expect(formatCurrency('1000')).toBe('$1,000');
      expect(formatCurrency('150000')).toBe('$150,000');
    });

    it('should handle numbers with currency symbols', () => {
      expect(formatCurrency('$1000')).toBe('$1,000');
      expect(formatCurrency('$150,000')).toBe('$150,000');
    });

    it('should handle decimal numbers', () => {
      expect(formatCurrency(1000.50)).toBe('$1,001');
      expect(formatCurrency(150000.99)).toBe('$150,001');
    });

    it('should return $0 for invalid numbers', () => {
      expect(formatCurrency('invalid')).toBe('$0');
      expect(formatCurrency('')).toBe('$0');
      expect(formatCurrency(null)).toBe('$0');
      expect(formatCurrency(undefined)).toBe('$0');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrency(-1000)).toBe('$1,000');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(150000)).toBe('150,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle string numbers', () => {
      expect(formatNumber('1000')).toBe('1,000');
      expect(formatNumber('150000')).toBe('150,000');
    });

    it('should handle decimal numbers', () => {
      expect(formatNumber(1000.5)).toBe('1,000.5');
      expect(formatNumber(150000.99)).toBe('150,000.99');
    });

    it('should return original value for invalid numbers', () => {
      expect(formatNumber('invalid')).toBe('invalid');
      expect(formatNumber('')).toBe('0');
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe(undefined);
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
    });
  });

  describe('formatDate', () => {
    it('should convert YYYY-MM-DD to MM/DD/YYYY', () => {
      expect(formatDate('2023-12-25')).toBe('12/25/2023');
      expect(formatDate('2024-01-01')).toBe('01/01/2024');
      expect(formatDate('2023-06-15')).toBe('06/15/2023');
    });

    it('should return original value for non-YYYY-MM-DD format', () => {
      expect(formatDate('12/25/2023')).toBe('12/25/2023');
      expect(formatDate('2023/12/25')).toBe('2023/12/25');
      expect(formatDate('25-12-2023')).toBe('25-12-2023');
    });

    it('should handle invalid inputs', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate(123)).toBe('');
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });

    it('should handle edge cases', () => {
      expect(formatDate('2023-00-01')).toBe('00/01/2023');
      expect(formatDate('2023-13-01')).toBe('13/01/2023');
      expect(formatDate('2023-12-32')).toBe('12/32/2023');
    });
  });
}); 