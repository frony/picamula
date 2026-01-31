import { dateTransformer } from './date-transformer';

describe('dateTransformer', () => {
  describe('to (write to database)', () => {
    it('should pass through string value as-is', () => {
      expect(dateTransformer.to('2025-06-15')).toBe('2025-06-15');
    });

    it('should pass through null value', () => {
      expect(dateTransformer.to(null)).toBeNull();
    });

    it('should pass through empty string', () => {
      expect(dateTransformer.to('')).toBe('');
    });
  });

  describe('from (read from database)', () => {
    it('should return null for null value', () => {
      expect(dateTransformer.from(null)).toBeNull();
    });

    it('should return null for undefined value', () => {
      expect(dateTransformer.from(undefined as any)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(dateTransformer.from('')).toBeNull();
    });

    it('should convert Date object to YYYY-MM-DD string', () => {
      const date = new Date('2025-06-15T12:00:00Z');
      expect(dateTransformer.from(date)).toBe('2025-06-15');
    });

    it('should convert Date object with different time to YYYY-MM-DD string', () => {
      const date = new Date('2025-12-25T23:59:59Z');
      expect(dateTransformer.from(date)).toBe('2025-12-25');
    });

    it('should extract date part from ISO string', () => {
      expect(dateTransformer.from('2025-06-15T12:00:00Z')).toBe('2025-06-15');
    });

    it('should extract date part from ISO string with timezone', () => {
      expect(dateTransformer.from('2025-06-15T12:00:00+05:00')).toBe('2025-06-15');
    });

    it('should handle plain date string', () => {
      expect(dateTransformer.from('2025-06-15')).toBe('2025-06-15');
    });

    it('should handle date string with time but no timezone', () => {
      expect(dateTransformer.from('2025-06-15T12:00:00')).toBe('2025-06-15');
    });
  });
});
