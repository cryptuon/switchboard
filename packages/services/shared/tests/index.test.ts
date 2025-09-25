import { validateChainName, formatTransactionId, sleep } from '../src/index';

describe('Shared Utilities', () => {
  describe('validateChainName', () => {
    it('should return true for supported chains', () => {
      expect(validateChainName('ethereum')).toBe(true);
      expect(validateChainName('polygon')).toBe(true);
      expect(validateChainName('solana')).toBe(true);
    });

    it('should return false for unsupported chains', () => {
      expect(validateChainName('unsupported')).toBe(false);
    });
  });

  describe('formatTransactionId', () => {
    it('should format transaction IDs consistently', () => {
      expect(formatTransactionId('  0xABC123  ')).toBe('0xabc123');
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(95); // Allow for small timing variations
    });
  });
});