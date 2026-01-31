/**
 * Transformer for date columns to handle timezone issues.
 * Converts Date objects to YYYY-MM-DD strings and passes strings through.
 */
export const dateTransformer = {
  to: (value: string | null): string | null => value, // Store as-is
  from: (value: Date | string | null): string | null => {
    if (!value) return null;
    // If it's a Date object, convert to YYYY-MM-DD string
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    // If it's already a string, extract date part
    return String(value).split('T')[0];
  }
};
