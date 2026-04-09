import { formatCurrency, parseCurrency } from './utils/format';

test('formats large rupee amounts in lakhs', () => {
  expect(formatCurrency(250000)).toBe('₹2.5L');
});

test('parses formatted currency strings back to numbers', () => {
  expect(parseCurrency('₹1,25,000')).toBe(125000);
});
