import { formatOrderNumber, formatCurrency, formatDate } from '../../app/utils/formatters';

describe('formatOrderNumber', () => {
  it('formats a UUID to ORD- prefix + first 8 uppercase chars', () => {
    expect(formatOrderNumber('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('ORD-A1B2C3D4');
  });

  it('returns N/A for null', () => {
    expect(formatOrderNumber(null)).toBe('N/A');
  });

  it('returns N/A for undefined', () => {
    expect(formatOrderNumber(undefined)).toBe('N/A');
  });

  it('returns N/A for empty string', () => {
    expect(formatOrderNumber('')).toBe('N/A');
  });

  it('uppercases lowercase hex characters', () => {
    expect(formatOrderNumber('abcdefgh-rest')).toBe('ORD-ABCDEFGH');
  });
});

describe('formatCurrency', () => {
  it('formats a whole number correctly', () => {
    expect(formatCurrency(100)).toBe('N$100.00');
  });

  it('formats a decimal amount to 2 decimal places', () => {
    expect(formatCurrency(49.9)).toBe('N$49.90');
  });

  it('adds thousands separator for large amounts', () => {
    expect(formatCurrency(1234.56)).toBe('N$1,234.56');
  });

  it('formats amounts over 1 million', () => {
    expect(formatCurrency(1000000)).toBe('N$1,000,000.00');
  });

  it('returns N$0.00 for null', () => {
    expect(formatCurrency(null)).toBe('N$0.00');
  });

  it('returns N$0.00 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('N$0.00');
  });

  it('returns N$0.00 for 0', () => {
    expect(formatCurrency(0)).toBe('N$0.00');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-12-25T00:00:00.000Z');
    expect(result).toContain('Dec');
    expect(result).toContain('25');
    expect(result).toContain('2024');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });
});
